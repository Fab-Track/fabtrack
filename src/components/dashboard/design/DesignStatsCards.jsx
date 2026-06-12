import React from "react";
import { Ruler, Pencil, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import DashKpiCard from "@/components/dashboard/shared/DashKpiCard";

export default function DesignStatsCards({ measuresNeeded, drawingsNeeded, inProgress, awaitingApproval, completedThisMonth }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <DashKpiCard
        label="Measures Needed"
        value={measuresNeeded}
        icon={Ruler}
        iconColor="bg-sky-100 text-sky-700"
        highlight={measuresNeeded > 0 ? "orange" : undefined}
      />
      <DashKpiCard
        label="Drawings Needed"
        value={drawingsNeeded}
        icon={Pencil}
        iconColor="bg-violet-100 text-violet-700"
        highlight={drawingsNeeded > 0 ? "orange" : undefined}
      />
      <DashKpiCard
        label="In Progress"
        value={inProgress}
        icon={Clock}
        iconColor="bg-amber-100 text-amber-700"
      />
      <DashKpiCard
        label="Awaiting Approval"
        value={awaitingApproval}
        icon={AlertTriangle}
        iconColor={awaitingApproval > 0 ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}
        highlight={awaitingApproval > 0 ? "red" : undefined}
        valueColor={awaitingApproval > 0 ? "text-red-600" : undefined}
      />
      <DashKpiCard
        label="Completed (MTD)"
        value={completedThisMonth}
        icon={CheckCircle2}
        iconColor="bg-emerald-100 text-emerald-700"
      />
    </div>
  );
}