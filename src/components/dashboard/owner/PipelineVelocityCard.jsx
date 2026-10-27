import React from "react";
import { Gauge } from "lucide-react";
import { parseISO, differenceInCalendarDays } from "date-fns";
import { PHASE_COLORS } from "@/lib/scheduleUtils";

export default function PipelineVelocityCard({ jobs }) {
  const wonJobs = (jobs || []).filter(j => j.lead_outcome === "Qualified — Won" && j.lead_closed_at);

  // Group by service category and calculate average days to close
  const categoryData = {};
  wonJobs.forEach(j => {
    // Determine service category from job_type or from linked estimates
    const cat = j.job_type || "Other";
    const created = parseISO(j.created_date);
    const closed = parseISO(j.lead_closed_at);
    const days = differenceInCalendarDays(closed, created) + 1;

    if (!categoryData[cat]) categoryData[cat] = { total: 0, count: 0, min: Infinity };
    categoryData[cat].total += days;
    categoryData[cat].count++;
    if (days < categoryData[cat].min) categoryData[cat].min = days;
  });

  const rows = Object.entries(categoryData)
    .map(([cat, d]) => ({ category: cat, avg: Math.round(d.total / d.count), count: d.count, fastest: d.min }))
    .sort((a, b) => b.count - a.count);

  const overallAvg = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.avg, 0) / rows.length)
    : null;

  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pipeline Velocity</p>

      {overallAvg !== null ? (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="text-2xl font-bold">{overallAvg}d</p>
            <p className="text-xs text-muted-foreground">Avg days to close</p>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground mb-3">No won jobs yet</div>
      )}

      {rows.length > 0 && (
        <div className="space-y-1.5 mt-2 pt-3 border-t">
          {rows.slice(0, 5).map(row => (
            <div key={row.category} className="flex items-center justify-between text-xs">
              <span className="font-medium truncate mr-2">{row.category}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {row.avg}d avg ({row.count} jobs)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}