/**
 * HoursStatsRow — shows Today / This Week / Pay Period hours for an employee.
 * Hours only — no dollar amounts or wage info.
 */
import React from "react";
import { getCurrentPayPeriod, aggregateHours, getLiveElapsedSeconds, formatHours } from "@/lib/timeTrackingHelpers";
import { parseISO, startOfDay, startOfWeek } from "date-fns";

function Tile({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${highlight ? "border-accent bg-accent/5" : "bg-card"}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function HoursStatsRow({ employee, timeEntries = [], activeEntry }) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const pp = getCurrentPayPeriod();

  // Completed entries only (not active)
  const completed = timeEntries.filter(
    e => e.employee_id === employee?.id && !e.is_active && (e.entry_type === "shift" || !e.entry_type)
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

  return (
    <div className="grid grid-cols-3 gap-3">
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
    </div>
  );
}