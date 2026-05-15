import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import FabricatorStatsRow from "@/components/dashboard/fabricator/FabricatorStatsRow";
import MyCurrentJob from "@/components/dashboard/fabricator/MyCurrentJob";
import MyJobsThisWeek from "@/components/dashboard/fabricator/MyJobsThisWeek";
import MyScoreBreakdown from "@/components/dashboard/fabricator/MyScoreBreakdown";
import MyMonthComparison from "@/components/dashboard/fabricator/MyMonthComparison";

export default function FabricatorDashboard() {
  const { user } = useAuth();

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
    refetchInterval: 15000,
  });

  const { data: qcInspections = [] } = useQuery({
    queryKey: ["qcInspections"],
    queryFn: () => base44.entities.QCInspection.list("-created_date", 200),
  });

  // Match the logged-in user to an employee record by email
  const myEmployee = employees.find(e => e.email === user?.email) || null;

  // Active entry for this employee
  const myActiveEntry = myEmployee
    ? activeEntries.find(e => e.employee_id === myEmployee.id) || null
    : null;

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
      {/* Large stat cards */}
      <FabricatorStatsRow
        employee={myEmployee}
        timeEntries={allTimeEntries}
        qcInspections={qcInspections}
      />

      {/* Current job clock-out widget */}
      <MyCurrentJob
        activeEntry={myActiveEntry}
        allTimeEntries={allTimeEntries}
      />

      {/* Jobs this week */}
      <MyJobsThisWeek
        employee={myEmployee}
        timeEntries={allTimeEntries}
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