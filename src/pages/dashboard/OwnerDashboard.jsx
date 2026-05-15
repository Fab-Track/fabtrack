import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import OwnerStatsRow from "@/components/dashboard/owner/OwnerStatsRow";
import InstallDateTracker from "@/components/dashboard/InstallDateTracker";
import MarginTracker from "@/components/dashboard/MarginTracker";
import CapacityView from "@/components/dashboard/CapacityView";
import StalledJobs from "@/components/dashboard/StalledJobs";
import ActiveClockIns from "@/components/dashboard/ActiveClockIns";
import SalesFunnelWidget from "@/components/dashboard/owner/SalesFunnelWidget";
import OverdueBillingWidget from "@/components/dashboard/owner/OverdueBillingWidget";
import TeamUtilizationWidget from "@/components/dashboard/owner/TeamUtilizationWidget";

export default function OwnerDashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 100),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active"],
    queryFn: () => base44.entities.TimeEntry.filter({ is_active: true }),
  });
  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "all"],
    queryFn: () => base44.entities.TimeEntry.list("-clock_in", 500),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  if (jobsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Extended stats + full pipeline bar */}
      <OwnerStatsRow jobs={jobs} purchaseOrders={purchaseOrders} invoices={invoices} />

      {/* Main 2-col grid */}
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

      {/* Owner-only widgets row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <SalesFunnelWidget jobs={jobs} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <OverdueBillingWidget jobs={jobs} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <TeamUtilizationWidget employees={employees} timeEntries={allTimeEntries} />
        </div>
      </div>

      {/* Active clock-ins */}
      <div className="bg-card rounded-xl border p-4">
        <ActiveClockIns timeEntries={timeEntries} />
      </div>
    </div>
  );
}