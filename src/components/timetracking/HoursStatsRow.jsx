/**
 * HoursStatsRow — shows Today / This Week / Pay Period hours for an employee.
 * Hours only — no dollar amounts or wage info.
 */
import React from "react";
import { getCurrentPayPeriod, aggregateHours, getLiveElapsedSeconds, formatHours } from "@/lib/timeTrackingHelpers";
import { parseISO, startOfDay, startOfWeek } from "date-fns";

function Tile({ label, value, sub, highlight, valueColor = "text-foreground" }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${highlight ? "border-accent bg-accent/5" : "bg-card"}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function HoursStatsRow({ employee, timeEntries = [], activeEntry, qcInspections }) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const pp = getCurrentPayPeriod();

  // Payroll hours: completed master clock entries only (no job_id = payroll clock)
  const completed = timeEntries.filter(
    e =>
      e.employee_id === employee?.id &&
      !e.is_active &&
      (e.entry_type === "shift" || !e.entry_type) &&
      !e.job_id   // master clock only — job entries don't count toward payroll
  );

  const isMyActive = activeEntry?.employee_id === employee?.id;
  const liveHours = isMyActive ? getLiveElapsedSeconds(activeEntry) / 3600 : 0;

  const completedToday = completed
    .filter(e => e.clock_in && parseISO(e.clock_in) >= todayStart)
    .reduce((s, e) => s + (e.net_hours ?? e.duration_hours ?? 0), 0);

  const completedWeek = completed
    .filter(e => e.clock_in && parseISO(e.clock_in) >= weekStart)
    .reduce((s, e) => s + (e.net_hours ?? e.duration_hours ?? 0), 0);

  const completedPP = completed
    .filter(e => {
      if (!e.clock_in) return false;
      const d = parseISO(e.clock_in);
      return d >= pp.start && d <= pp.end;
    })
    .reduce((s, e) => s + (e.net_hours ?? e.duration_hours ?? 0), 0);

  const todayHours = completedToday + (isMyActive && activeEntry.clock_in && parseISO(activeEntry.clock_in) >= todayStart ? liveHours : 0);
  const weekHours  = completedWeek  + (isMyActive && activeEntry.clock_in && parseISO(activeEntry.clock_in) >= weekStart  ? liveHours : 0);
  const ppHours    = completedPP    + (isMyActive && activeEntry.clock_in && parseISO(activeEntry.clock_in) >= pp.start    ? liveHours : 0);

  // QC / Craftsman Score (30-day rolling average)
  const hasQC = Array.isArray(qcInspections);
  let avgScore = null;
  let scoreColor = "text-muted-foreground";
  if (hasQC) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const myQC = qcInspections.filter(
      q => q.employee_id === employee?.id && q.created_date && parseISO(q.created_date) >= thirtyDaysAgo
    );
    if (myQC.length > 0) {
      avgScore = Math.round(myQC.reduce((s, q) => s + (q.quality_score || 0), 0) / myQC.length);
      scoreColor = avgScore >= 80 ? "text-green-500" : avgScore >= 60 ? "text-yellow-500" : "text-red-500";
    }
  }

  return (
    <div className={`grid gap-3 ${hasQC ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}>
      <Tile
        label="Today"
        value={formatHours(todayHours)}
        sub={isMyActive ? "live" : "completed"}
        highlight={isMyActive}
      />
      <Tile
        label="This Week"
        value={formatHours(weekHours)}
        sub={weekHours >= 40 ? "⚠ OT territory" : undefined}
      />
      <Tile
        label="Pay Period"
        value={formatHours(ppHours)}
        sub={pp.label}
      />
      {hasQC && (
        <Tile
          label="Craftsman Score"
          value={avgScore !== null ? avgScore : "—"}
          sub="30-day rolling avg / 100"
          valueColor={scoreColor}
        />
      )}
    </div>
  );
}