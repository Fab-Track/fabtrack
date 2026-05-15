import React from "react";
import { startOfMonth, subMonths, parseISO } from "date-fns";

function Num({ label, thisMonth, lastMonth }) {
  const diff = thisMonth - lastMonth;
  const pct = lastMonth > 0 ? Math.round((diff / lastMonth) * 100) : null;
  return (
    <div className="flex-1 min-w-[120px]">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold">{typeof thisMonth === "number" && !Number.isInteger(thisMonth) ? thisMonth.toFixed(1) : thisMonth}</p>
        <p className="text-sm text-muted-foreground mb-1 line-through">
          {typeof lastMonth === "number" && !Number.isInteger(lastMonth) ? lastMonth.toFixed(1) : lastMonth}
        </p>
      </div>
      {pct !== null && (
        <p className={`text-xs font-medium ${diff >= 0 ? "text-green-500" : "text-red-500"}`}>
          {diff >= 0 ? "+" : ""}{pct}% vs last month
        </p>
      )}
    </div>
  );
}

export default function MyMonthComparison({ employee, timeEntries, qcInspections, jobs }) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const myCompleted = (timeEntries || []).filter(
    e => e.employee_id === employee?.id && !e.is_active && e.clock_in
  );

  const thisMonthEntries = myCompleted.filter(e => parseISO(e.clock_in) >= thisMonthStart);
  const lastMonthEntries = myCompleted.filter(e => {
    const d = parseISO(e.clock_in);
    return d >= lastMonthStart && d < thisMonthStart;
  });

  const hoursThis = thisMonthEntries.reduce((s, e) => s + (e.duration_hours || 0), 0);
  const hoursLast = lastMonthEntries.reduce((s, e) => s + (e.duration_hours || 0), 0);

  // Jobs completed (unique job IDs with entries this month from jobs that are in Install Complete/Invoiced)
  const completedJobIds = new Set((jobs || []).filter(j => ["Install Complete", "Invoiced"].includes(j.status)).map(j => j.id));
  const jobsThis = new Set(thisMonthEntries.filter(e => completedJobIds.has(e.job_id)).map(e => e.job_id)).size;
  const jobsLast = new Set(lastMonthEntries.filter(e => completedJobIds.has(e.job_id)).map(e => e.job_id)).size;

  const myQC = (qcInspections || []).filter(q => q.employee_id === employee?.id && q.quality_score != null && q.created_date);
  const qcThis = myQC.filter(q => parseISO(q.created_date) >= thisMonthStart);
  const qcLast = myQC.filter(q => { const d = parseISO(q.created_date); return d >= lastMonthStart && d < thisMonthStart; });

  const avgQCThis = qcThis.length > 0 ? qcThis.reduce((s, q) => s + q.quality_score, 0) / qcThis.length : 0;
  const avgQCLast = qcLast.length > 0 ? qcLast.reduce((s, q) => s + q.quality_score, 0) / qcLast.length : 0;

  const reworkThis = qcThis.length > 0 ? Math.round((qcThis.filter(q => q.rework_required).length / qcThis.length) * 100) : 0;
  const reworkLast = qcLast.length > 0 ? Math.round((qcLast.filter(q => q.rework_required).length / qcLast.length) * 100) : 0;

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">This Month vs Last Month</h3>
        <p className="text-xs text-muted-foreground">Strikethrough = last month</p>
      </div>
      <div className="flex flex-wrap gap-6">
        <Num label="Hours Logged" thisMonth={hoursThis} lastMonth={hoursLast} />
        <Num label="Jobs Completed" thisMonth={jobsThis} lastMonth={jobsLast} />
        <Num label="Avg QC Score" thisMonth={Math.round(avgQCThis)} lastMonth={Math.round(avgQCLast)} />
        <Num label="Rework Rate %" thisMonth={reworkThis} lastMonth={reworkLast} />
      </div>
    </div>
  );
}