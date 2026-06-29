import React, { useEffect, useState } from "react";
import { differenceInSeconds, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import FabricatorStatsRow from "@/components/dashboard/fabricator/FabricatorStatsRow";
import MyCurrentJob from "@/components/dashboard/fabricator/MyCurrentJob";
import MyJobsThisWeek from "@/components/dashboard/fabricator/MyJobsThisWeek";
import MyScoreBreakdown from "@/components/dashboard/fabricator/MyScoreBreakdown";
import MyMonthComparison from "@/components/dashboard/fabricator/MyMonthComparison";
import NextInstallCard from "@/components/dashboard/fabricator/NextInstallCard";
import MyUpcomingInstalls from "@/components/dashboard/fabricator/MyUpcomingInstalls";
import DashboardTodosWidget from "@/components/dashboard/shared/DashboardTodosWidget";
import MasterClockCard from "@/components/timetracking/MasterClockCard";
import HoursStatsRow from "@/components/timetracking/HoursStatsRow";
import { useOrgFilter } from "@/lib/orgContext";

export default function FabricatorDashboard({ overrideEmployee = null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Live elapsed seconds for active session — drives real-time hour counts
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState(0);

  const orgFilter = useOrgFilter();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgFilter],
    queryFn: () => base44.entities.Employee.filter(orgFilter, "-created_date", 100),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", orgFilter],
    queryFn: () => base44.entities.Job.filter(orgFilter, "-created_date", 200),
  });

  const { data: allTimeEntries = [], isLoading } = useQuery({
    queryKey: ["timeEntries", "all", orgFilter],
    queryFn: () => base44.entities.TimeEntry.filter(orgFilter, "-clock_in", 500),
  });

  const { data: activeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active", orgFilter],
    queryFn: () => base44.entities.TimeEntry.filter({ ...orgFilter, is_active: true }),
    refetchInterval: 30000,
  });

  const { data: qcInspections = [] } = useQuery({
    queryKey: ["qcInspections", orgFilter],
    queryFn: () => base44.entities.QCInspection.filter(orgFilter, "-created_date", 200),
  });

  // Use impersonated employee if provided, otherwise find via fallback chain:
  // 1. Match by user_id  2. Match by email
  const myEmployee = overrideEmployee
    ? (employees.find(e => e.id === overrideEmployee.id) || overrideEmployee)
    : (employees.find(e => e.user_id === user?.id) ||
       employees.find(e => e.email === user?.email) ||
       null);

  // All active entries for this employee (null if no Employee record linked)
  const myId = myEmployee?.id || null;
  const myActiveEntries = myId
    ? activeEntries.filter(e => e.employee_id === myId)
    : [];

  // Master/payroll clock = active shift entry with NO job_id
  const masterEntry = myActiveEntries.find(e => !e.job_id) || null;

  // Job-level clock entries = active shift entries WITH a job_id (shop floor)
  const jobActiveEntries = myActiveEntries.filter(e => !!e.job_id);

  // For backwards compat with components that expect a single activeEntry
  const myActiveEntry = masterEntry;

  // Real-time subscription to TimeEntry changes — invalidates queries instantly
  useEffect(() => {
    const unsubscribe = base44.entities.TimeEntry.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Live 1-second ticker — based on master (payroll) entry
  useEffect(() => {
    if (!masterEntry?.clock_in) {
      setActiveElapsedSeconds(0);
      return;
    }
    const tick = () => {
      const secs = differenceInSeconds(new Date(), parseISO(masterEntry.clock_in));
      setActiveElapsedSeconds(Math.max(0, secs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [masterEntry?.clock_in]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── MASTER / PAYROLL CLOCK ── top of dashboard, always visible */}
      <div className="space-y-3">
        <MasterClockCard
          employee={myEmployee || { id: null, name: user?.full_name, work_center_primary: "General", organization_id: user?.organization_id }}
          masterEntry={masterEntry}
        />
        {myEmployee && (
          <HoursStatsRow
            employee={myEmployee}
            timeEntries={allTimeEntries}
            activeEntry={masterEntry}
          />
        )}
      </div>

      {/* ── To-Dos ── */}
      <DashboardTodosWidget />

      {/* Large stat cards */}
      <FabricatorStatsRow
        employee={myEmployee}
        timeEntries={allTimeEntries}
        activeEntry={masterEntry}
        activeElapsedSeconds={activeElapsedSeconds}
        qcInspections={qcInspections}
      />

      {/* ── JOB CLOCK (Shop Floor / job costing only) ── */}
      <MyCurrentJob
        activeEntries={jobActiveEntries}
        activeElapsedSeconds={activeElapsedSeconds}
        allTimeEntries={allTimeEntries}
        jobs={jobs}
        masterEntry={masterEntry}
      />

      {/* Jobs this week */}
      <MyJobsThisWeek
        employee={myEmployee}
        timeEntries={allTimeEntries}
        activeEntry={myActiveEntry}
        activeElapsedSeconds={activeElapsedSeconds}
        qcInspections={qcInspections}
        jobs={jobs}
      />

      {/* Install widgets */}
      <div className="grid lg:grid-cols-2 gap-4">
        <NextInstallCard employee={myEmployee} jobs={jobs} />
        <MyUpcomingInstalls employee={myEmployee} jobs={jobs} />
      </div>

      {/* Score breakdown + month comparison side by side */}
      <div className="grid lg:grid-cols-2 gap-4">
        <MyScoreBreakdown
          employee={myEmployee}
          qcInspections={qcInspections}
          jobs={jobs}
        />
        <MyMonthComparison
          employee={myEmployee}
          timeEntries={allTimeEntries}
          qcInspections={qcInspections}
          jobs={jobs}
        />
      </div>
    </div>
  );
}