import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import EstimatorStatsRow from "@/components/dashboard/estimator/EstimatorStatsRow";
import SalesFunnelEstimator from "@/components/dashboard/estimator/SalesFunnelEstimator";
import EstimatesAging from "@/components/dashboard/estimator/EstimatesAging";
import RecentSalesActivity from "@/components/dashboard/estimator/RecentSalesActivity";
import RevenueGoalWidget from "@/components/dashboard/estimator/RevenueGoalWidget";
import LeadOutcomesRow from "@/components/dashboard/estimator/LeadOutcomesRow";

export default function EstimatorDashboard() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list("-created_date", 200),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <EstimatorStatsRow jobs={jobs} estimates={estimates} />

      {/* Funnel + Revenue goal */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SalesFunnelEstimator jobs={jobs} />
        <RevenueGoalWidget jobs={jobs} />
      </div>

      {/* Lead Outcomes */}
      <LeadOutcomesRow jobs={jobs} />

      {/* Estimates aging — full width */}
      <EstimatesAging estimates={estimates} jobs={jobs} />

      {/* Recent activity — full width */}
      <RecentSalesActivity jobs={jobs} estimates={estimates} />
    </div>
  );
}