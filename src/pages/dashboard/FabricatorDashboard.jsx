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

export default function FabricatorDashboard({ overrideEmployee = null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Live elapsed seconds for active session — drives real-time hour counts
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState(0);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const { data: allTimeEntries = [], isLoading } = useQuery({
    queryKey: ["timeEntries", "all"],
    queryFn: () => base44.entities.TimeEntry.list("-clock_in", 500),
  });

  const { data: activeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active"],
    queryFn: () => base44.entities.TimeEntry.filter({ is_active: true }),
    refetchInterval: 30000,
  });

  const { data: qcInspections = [] } = useQuery({
    queryKey: ["qcInspections"],
    queryFn: () => base44.entities.QCInspection.list("-created_date", 200),
  });

  // Use impersonated employee if provided, otherwise match logged-in user by email
  const myEmployee = overrideEmployee
    ? (employees.find(e => e.id === overrideEmployee.id) || overrideEmployee)
    : (employees.find(e => e.email === user?.email) || null);

  // All active entries for this employee (supports multiple simultaneous clock-ins)
  const myActiveEntries = myEmployee
    ? activeEntries.filter(e => e.employee_id === myEmployee.id)
    : [];
  const myActiveEntry = myActiveEntries[0] || null;

  // Real-time subscription to TimeEntry changes — invalidates queries instantly
  useEffect(() => {
    const unsubscribe = base44.entities.TimeEntry.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Live 1-second ticker for the active session elapsed time
  useEffect(() => {
    if (!myActiveEntry?.clock_in) {
      setActiveElapsedSeconds(0);
      return;
    }
    const tick = () => {
      const secs = differenceInSeconds(new Date(), parseISO(myActiveEntry.clock_in));
      setActiveElapsedSeconds(Math.max(0, secs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [myActiveEntry?.clock_in]);

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
      {/* Large stat cards — activeElapsedSeconds keeps hours live */}
      <FabricatorStatsRow
        employee={myEmployee}
        timeEntries={allTimeEntries}
        activeEntry={myActiveEntry}
        activeElapsedSeconds={activeElapsedSeconds}
        qcInspections={qcInspections}
      />

      {/* Current job clock-out widget */}
      <MyCurrentJob
        activeEntries={myActiveEntries}
        activeElapsedSeconds={activeElapsedSeconds}
        allTimeEntries={allTimeEntries}
        jobs={jobs}
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