import React from "react";
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";

const FUNNEL_STAGES = [
  { key: "leads",    label: "Leads",              stageMatch: (j) => j.pipeline_board === "Sales" },
  { key: "sent",     label: "Estimates Sent",      stageMatch: (j) => j.pipeline_board === "Sales" && (j.stage || "").includes("Estimate Sent") },
  { key: "approved", label: "Approved",             stageMatch: (j) => j.pipeline_board === "Sales" && (j.stage || "").includes("Deposit Received") },
  { key: "deposit",  label: "Deposits Received",    stageMatch: (j) => j.pipeline_board === "Billing" || ["Fab Queue","In Fabrication","Powder Coat","Install Scheduled","Install Complete","Invoiced"].includes(j.status) },
];

function getFunnelCounts(jobs, startDate, endDate) {
  const interval = { start: startDate, end: endDate };
  const inRange = jobs.filter(j => {
    const d = j.created_date ? parseISO(j.created_date) : null;
    return d && isWithinInterval(d, interval);
  });
  return FUNNEL_STAGES.map(s => ({
    label: s.label,
    count: inRange.filter(s.stageMatch).length,
  }));
}

export default function SalesFunnelWidget({ jobs }) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonth = getFunnelCounts(jobs, thisMonthStart, thisMonthEnd);
  const lastMonth = getFunnelCounts(jobs, lastMonthStart, lastMonthEnd);

  const maxCount = Math.max(...thisMonth.map(s => s.count), ...lastMonth.map(s => s.count), 1);

  const COLORS = ["bg-cyan-500", "bg-blue-500", "bg-orange-500", "bg-emerald-500"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sales Funnel</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-primary/80" /> This Month</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-muted-foreground/30" /> Last Month</span>
        </div>
      </div>
      <div className="space-y-3">
        {FUNNEL_STAGES.map((stage, i) => {
          const tm = thisMonth[i];
          const lm = lastMonth[i];
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{stage.label}</span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-foreground font-semibold">{tm.count}</span>
                  <span className="text-muted-foreground">{lm.count}</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                {/* This month */}
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${COLORS[i]} transition-all`}
                    style={{ width: `${(tm.count / maxCount) * 100}%` }}
                  />
                </div>
                {/* Last month */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-muted-foreground/30 transition-all"
                    style={{ width: `${(lm.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}