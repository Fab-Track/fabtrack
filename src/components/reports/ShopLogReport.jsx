import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Progress } from "@/components/ui/progress";
import EmptyState from "./shared/EmptyState";

const HOUR_FIELDS = [
  { key: "shop_labor_hours", estKey: "est_shop_labor_hours", label: "Shop Labor" },
  { key: "install_labor_hours", estKey: "est_install_labor_hours", label: "Install Labor" },
  { key: "draw_measure_hours", estKey: "est_draw_measure_hours", label: "Draw/Measure" },
];

const COST_FIELDS = [
  { key: "materials_cost", estKey: "est_materials_cost", label: "Materials" },
  { key: "powder_coat_cost", estKey: "est_powder_coat_cost", label: "Powder Coat" },
  { key: "fuel_cost", estKey: "est_fuel_cost", label: "Fuel" },
];

export default function ShopLogReport({ jobs, range }) {
  const jobIds = jobs.map(j => j.id);

  const { data: shopLogEntries = [] } = useQuery({
    queryKey: ["shopLogEntries", "report", jobIds.length],
    queryFn: () => base44.entities.ShopLogEntry.filter({}, "-entry_date", 1000),
    enabled: jobIds.length > 0,
  });

  // Group entries by job
  const byJob = {};
  shopLogEntries.forEach(e => {
    if (!byJob[e.job_id]) byJob[e.job_id] = [];
    byJob[e.job_id].push(e);
  });

  // Only show jobs that have shop log entries or estimates
  const reportJobs = jobs.filter(j => {
    const hasEntries = (byJob[j.id] || []).length > 0;
    const hasEstimates = HOUR_FIELDS.some(f => (j[f.estKey] || 0) > 0) || COST_FIELDS.some(f => (j[f.estKey] || 0) > 0);
    return hasEntries || hasEstimates;
  });

  if (reportJobs.length === 0) {
    return <EmptyState message="No shop log data yet. Add estimates or log entries on jobs to see progress here." />;
  }

  const fmtHrs = (v) => `${(v || 0).toFixed(1)}h`;
  const fmtUSD = (v) => `$${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-sm">Shop Log Performance (Estimated vs Actual)</h2>
      <div className="space-y-4">
        {reportJobs.map(job => {
          const entries = byJob[job.id] || [];
          const totals = {};
          [...HOUR_FIELDS, ...COST_FIELDS].forEach(f => {
            totals[f.key] = entries.reduce((s, e) => s + (e[f.key] || 0), 0);
          });
          const estHours = HOUR_FIELDS.reduce((s, f) => s + (job[f.estKey] || 0), 0);
          const actHours = HOUR_FIELDS.reduce((s, f) => s + totals[f.key], 0);
          const estCosts = COST_FIELDS.reduce((s, f) => s + (job[f.estKey] || 0), 0);
          const actCosts = COST_FIELDS.reduce((s, f) => s + totals[f.key], 0);

          const hrsPct = estHours > 0 ? Math.min((actHours / estHours) * 100, 100) : (actHours > 0 ? 100 : 0);
          const costPct = estCosts > 0 ? Math.min((actCosts / estCosts) * 100, 100) : (actCosts > 0 ? 100 : 0);

          return (
            <div key={job.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{job.job_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{job.job_number}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </div>
              </div>

              {/* Hours progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Hours: {fmtHrs(actHours)} / {fmtHrs(estHours)}</span>
                  <span className="font-medium">{hrsPct.toFixed(0)}%</span>
                </div>
                <Progress value={hrsPct} className={`h-2.5 ${actHours > estHours && estHours > 0 ? '[&>div]:bg-red-500' : hrsPct >= 90 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} />
              </div>

              {/* Cost progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Costs: {fmtUSD(actCosts)} / {fmtUSD(estCosts)}</span>
                  <span className="font-medium">{costPct.toFixed(0)}%</span>
                </div>
                <Progress value={costPct} className={`h-2.5 ${actCosts > estCosts && estCosts > 0 ? '[&>div]:bg-red-500' : costPct >= 90 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} />
              </div>

              {/* Per-category mini breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {HOUR_FIELDS.map(f => {
                  const est = job[f.estKey] || 0;
                  const act = totals[f.key] || 0;
                  const pct = est > 0 ? Math.min((act / est) * 100, 100) : (act > 0 ? 100 : 0);
                  return (
                    <div key={f.key} className="bg-muted/40 rounded px-2 py-1.5">
                      <p className="text-[10px] text-muted-foreground">{f.label}</p>
                      <p className="text-xs font-medium">{fmtHrs(act)} <span className="text-muted-foreground">/ {fmtHrs(est)}</span></p>
                      <Progress value={pct} className="h-1 mt-1" />
                    </div>
                  );
                })}
                {COST_FIELDS.map(f => {
                  const est = job[f.estKey] || 0;
                  const act = totals[f.key] || 0;
                  const pct = est > 0 ? Math.min((act / est) * 100, 100) : (act > 0 ? 100 : 0);
                  return (
                    <div key={f.key} className="bg-muted/40 rounded px-2 py-1.5">
                      <p className="text-[10px] text-muted-foreground">{f.label}</p>
                      <p className="text-xs font-medium">{fmtUSD(act)} <span className="text-muted-foreground">/ {fmtUSD(est)}</span></p>
                      <Progress value={pct} className="h-1 mt-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}