import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import MasterClockCard from "@/components/timetracking/MasterClockCard";
import HoursStatsRow from "@/components/timetracking/HoursStatsRow";
import JobClockSection from "@/components/timetracking/JobClockSection";
import { useOrgFilter } from "@/lib/orgContext";
import { differenceInSeconds, parseISO } from "date-fns";

export default function TimeCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState(0);
  const orgFilter = useOrgFilter();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", orgFilter],
    queryFn: () => base44.entities.Employee.filter(orgFilter, "-created_date", 100),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", orgFilter],
    queryFn: () => base44.entities.Job.filter(orgFilter, "-created_date", 200),
  });

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "all", orgFilter],
    queryFn: () => base44.entities.TimeEntry.filter(orgFilter, "-clock_in", 500),
  });

  const { data: activeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active", orgFilter],
    queryFn: () => base44.entities.TimeEntry.filter({ ...orgFilter, is_active: true }),
    refetchInterval: 30000,
  });

  // Find employee via fallback chain: user_id first, then email
  const myEmployee = employees.find(e => e.user_id === user?.id) ||
    employees.find(e => e.email === user?.email) ||
    null;

  const myId = myEmployee?.id || null;
  const myActiveEntries = myId
    ? activeEntries.filter(e => e.employee_id === myId)
    : [];

  // Master/payroll clock = active shift entry with NO job_id
  const masterEntry = myActiveEntries.find(e => !e.job_id) || null;
  // Job-level clock entries = active shift entries WITH a job_id
  const jobActiveEntries = myActiveEntries.filter(e => !!e.job_id);

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.TimeEntry.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Live 1-second ticker for master entry
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

  const fallbackEmployee = {
    id: null,
    name: user?.full_name,
    email: user?.email,
    work_center_primary: "General",
    organization_id: user?.organization_id,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Time Card</h1>
        <p className="text-sm text-muted-foreground">Clock in for the day and track time on jobs</p>
      </div>

      {/* Daily payroll clock */}
      <div className="space-y-3">
        <MasterClockCard
          employee={myEmployee || fallbackEmployee}
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

      {/* Job clock — inline search, activity selection, multiple active cards */}
      <JobClockSection
        employee={myEmployee || fallbackEmployee}
        masterEntry={masterEntry}
        activeEntries={jobActiveEntries}
        allTimeEntries={allTimeEntries}
        jobs={jobs}
      />
    </div>
  );
}