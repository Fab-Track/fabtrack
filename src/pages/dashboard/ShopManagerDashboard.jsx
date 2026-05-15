import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import ShopStatsRow from "@/components/dashboard/shop/ShopStatsRow";
import ActiveJobsBoard from "@/components/dashboard/shop/ActiveJobsBoard";
import WorkCenterLive from "@/components/dashboard/shop/WorkCenterLive";
import FabHoursChart from "@/components/dashboard/shop/FabHoursChart";
import CraftsmanScoreTrend from "@/components/dashboard/shop/CraftsmanScoreTrend";
import UpcomingInstalls from "@/components/dashboard/shop/UpcomingInstalls";

export default function ShopManagerDashboard() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active"],
    queryFn: () => base44.entities.TimeEntry.filter({ is_active: true }),
  });
  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "all"],
    queryFn: () => base44.entities.TimeEntry.list("-clock_in", 500),
  });
  const { data: qcInspections = [] } = useQuery({
    queryKey: ["qcInspections"],
    queryFn: () => base44.entities.QCInspection.list("-created_date", 200),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <ShopStatsRow jobs={jobs} timeEntries={allTimeEntries} qcInspections={qcInspections} />

      {/* Active Jobs Board — full width */}
      <div className="bg-card rounded-xl border p-4">
        <ActiveJobsBoard jobs={jobs} timeEntries={allTimeEntries} />
      </div>

      {/* Live work center activity — full width */}
      <div className="bg-card rounded-xl border p-4">
        <WorkCenterLive timeEntries={timeEntries} />
      </div>

      {/* Two column: fab hours + upcoming installs */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <FabHoursChart jobs={jobs} timeEntries={allTimeEntries} />
        </div>
        <div className="bg-card rounded-xl border p-4">
          <UpcomingInstalls jobs={jobs} />
        </div>
      </div>

      {/* Craftsman score trend — full width */}
      <div className="bg-card rounded-xl border p-4">
        <CraftsmanScoreTrend qcInspections={qcInspections} />
      </div>
    </div>
  );
}