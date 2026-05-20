import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import OwnerStatsRow from "@/components/dashboard/owner/OwnerStatsRow";
import ActiveJobLocationsMap from "@/components/dashboard/owner/ActiveJobLocationsMap";
import MarginTracker from "@/components/dashboard/MarginTracker";
import ActiveClockIns from "@/components/dashboard/ActiveClockIns";
import SalesFunnelWidget from "@/components/dashboard/owner/SalesFunnelWidget";
import NeedsAttention from "@/components/dashboard/owner/NeedsAttention";
import ShopSnapshot from "@/components/dashboard/owner/ShopSnapshot";
import RevenueByServiceType from "@/components/dashboard/owner/RevenueByServiceType";

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
  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates-all"],
    queryFn: () => base44.entities.Estimate.list("-created_date", 300),
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
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1 + 2: Stats + Pipeline Bar */}
      <OwnerStatsRow jobs={jobs} purchaseOrders={purchaseOrders} invoices={invoices} />

      {/* Row 3: Active Job Locations Map — full width */}
      <ActiveJobLocationsMap jobs={jobs} />

      {/* Row 4: Needs Attention + Shop Snapshot */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <NeedsAttention jobs={jobs} invoices={invoices} estimates={estimates} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <ShopSnapshot
            timeEntries={timeEntries}
            allTimeEntries={allTimeEntries}
            jobs={jobs}
            employees={employees}
          />
        </div>
      </div>

      {/* Row 4: Margins + Revenue by Service Type + Sales Funnel */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <MarginTracker jobs={jobs} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <RevenueByServiceType invoices={invoices} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <SalesFunnelWidget jobs={jobs} />
        </div>
      </div>
    </div>
  );
}