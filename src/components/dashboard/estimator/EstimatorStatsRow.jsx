import React from "react";
import { startOfMonth, parseISO } from "date-fns";

function StatCard({ label, value, subtext, valueColor = "text-foreground" }) {
  return (
    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between min-h-[110px]">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div>
        <p className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</p>
        {subtext && <p className="text-sm text-muted-foreground mt-1">{subtext}</p>}
      </div>
    </div>
  );
}

export default function EstimatorStatsRow({ jobs, estimates, invoices }) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);

  // Open leads: Sales board, stage = New Lead or Estimate In Progress
  const openLeads = (jobs || []).filter(j =>
    j.pipeline_board === "Sales" && ["New Lead", "Estimate In Progress"].includes(j.stage)
  ).length;

  // Estimates out: sent estimates awaiting response
  const estimatesOut = (estimates || []).filter(e => e.status === "Sent").length;

  // Revenue won this month: approved estimates + deposits received this month
  const revenueWon = (jobs || [])
    .filter(j => {
      if (!["Approved", "Deposit Received"].includes(j.stage)) return false;
      const d = j.stage_entered_at ? parseISO(j.stage_entered_at) : null;
      return d && d >= thisMonthStart;
    })
    .reduce((s, j) => s + (j.estimate_total || 0), 0);

  // Close rate: approved estimates / total sent estimates this month
  const sentThisMonth = (estimates || []).filter(e => {
    const d = e.created_date ? parseISO(e.created_date) : null;
    return d && d >= thisMonthStart && ["Sent", "Approved", "Rejected"].includes(e.status);
  });
  const approvedThisMonth = sentThisMonth.filter(e => e.status === "Approved").length;
  const closeRate = sentThisMonth.length > 0
    ? Math.round((approvedThisMonth / sentThisMonth.length) * 100)
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Open Leads" value={openLeads} subtext="in pipeline" />
      <StatCard label="Estimates Out" value={estimatesOut} subtext="awaiting response" valueColor="text-accent" />
      <StatCard
        label="Revenue Won This Month"
        value={revenueWon > 0 ? `$${revenueWon.toLocaleString()}` : "$0"}
        subtext="approved + deposits"
        valueColor="text-green-500"
      />
      <StatCard
        label="Close Rate This Month"
        value={closeRate !== null ? `${closeRate}%` : "—"}
        subtext={`${approvedThisMonth} of ${sentThisMonth.length} estimates`}
        valueColor={closeRate !== null && closeRate >= 50 ? "text-green-500" : "text-yellow-500"}
      />
    </div>
  );
}