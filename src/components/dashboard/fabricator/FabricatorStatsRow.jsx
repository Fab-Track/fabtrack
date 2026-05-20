import React from "react";
import { startOfDay, startOfWeek, parseISO } from "date-fns";

function StatCard({ label, value, subtext, valueColor = "text-foreground" }) {
  return (
    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between min-h-[110px]">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div>
        <p className={`text-4xl font-bold tracking-tight ${valueColor}`}>{value}</p>
        {subtext && <p className="text-sm text-muted-foreground mt-1">{subtext}</p>}
      </div>
    </div>
  );
}

export default function FabricatorStatsRow({ employee, timeEntries, activeEntry, activeElapsedSeconds = 0, qcInspections }) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  // Completed entries for this employee only
  const myCompleted = (timeEntries || []).filter(e => e.employee_id === employee?.id && !e.is_active);

  // Completed hours today
  const completedToday = myCompleted
    .filter(e => e.clock_in && parseISO(e.clock_in) >= todayStart)
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

  // Completed hours this week
  const completedWeek = myCompleted
    .filter(e => e.clock_in && parseISO(e.clock_in) >= weekStart)
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

  // Add active session elapsed time (if this is my active entry)
  const isMyActive = activeEntry && activeEntry.employee_id === employee?.id;
  const activeHours = isMyActive ? activeElapsedSeconds / 3600 : 0;

  const hoursToday = completedToday + (isMyActive && activeEntry.clock_in && parseISO(activeEntry.clock_in) >= todayStart ? activeHours : 0);
  const hoursWeek  = completedWeek  + (isMyActive && activeEntry.clock_in && parseISO(activeEntry.clock_in) >= weekStart  ? activeHours : 0);

  // QC score
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const myQC = (qcInspections || []).filter(
    q => q.employee_id === employee?.id && q.created_date && parseISO(q.created_date) >= thirtyDaysAgo
  );
  const avgScore = myQC.length > 0
    ? Math.round(myQC.reduce((s, q) => s + (q.quality_score || 0), 0) / myQC.length)
    : null;

  const scoreColor = avgScore === null
    ? "text-muted-foreground"
    : avgScore >= 80 ? "text-green-500"
    : avgScore >= 60 ? "text-yellow-500"
    : "text-red-500";

  // Active Jobs = distinct jobs touched this week (completed + active session)
  const weekJobIds = new Set(
    myCompleted
      .filter(e => e.clock_in && parseISO(e.clock_in) >= weekStart)
      .map(e => e.job_id)
  );
  if (isMyActive && activeEntry.clock_in && parseISO(activeEntry.clock_in) >= weekStart) {
    weekJobIds.add(activeEntry.job_id);
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="My Hours Today"
        value={hoursToday.toFixed(1)}
        subtext={isMyActive ? "includes active session" : "hours logged"}
      />
      <StatCard
        label="My Hours This Week"
        value={hoursWeek.toFixed(1)}
        subtext={isMyActive ? "includes active session" : "hours logged"}
      />
      <StatCard
        label="My Craftsman Score"
        value={avgScore !== null ? avgScore : "—"}
        subtext="30-day rolling avg / 100"
        valueColor={scoreColor}
      />
      <StatCard
        label="My Active Jobs"
        value={weekJobIds.size}
        subtext="jobs this week"
      />
    </div>
  );
}