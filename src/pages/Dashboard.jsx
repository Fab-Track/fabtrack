import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import StatsRow from "@/components/dashboard/StatsRow";
import InstallDateTracker from "@/components/dashboard/InstallDateTracker";
import MarginTracker from "@/components/dashboard/MarginTracker";
import CapacityView from "@/components/dashboard/CapacityView";
import StalledJobs from "@/components/dashboard/StalledJobs";
import ActiveClockIns from "@/components/dashboard/ActiveClockIns";

export default function Dashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 100),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active"],
    queryFn: () => base44.entities.TimeEntry.filter({ is_active: true }),
  });

  if (jobsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Stats row */}
      <StatsRow jobs={jobs} purchaseOrders={purchaseOrders} />

      {/* Main grid: 4 key questions */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <InstallDateTracker jobs={jobs} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <MarginTracker jobs={jobs} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <CapacityView jobs={jobs} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <StalledJobs jobs={jobs} />
        </div>
      </div>

      {/* Active clock-ins */}
      <div className="bg-card rounded-xl border p-4">
        <ActiveClockIns timeEntries={timeEntries} />
      </div>
    </div>
  );
}