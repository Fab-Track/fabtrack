import React from "react";
import { startOfDay, startOfWeek, parseISO, isAfter, subDays } from "date-fns";

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

export default function FabricatorStatsRow({ employee, timeEntries, qcInspections }) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thirtyDaysAgo = subDays(now, 30);

  const myEntries = (timeEntries || []).filter(e => e.employee_id === employee?.id && !e.is_active);

  const hoursToday = myEntries
    .filter(e => e.clock_in && parseISO(e.clock_in) >= todayStart)
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

  const hoursWeek = myEntries
    .filter(e => e.clock_in && parseISO(e.clock_in) >= weekStart)
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

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

  // Jobs I've logged time on this week
  const weekJobIds = new Set(
    myEntries
      .filter(e => e.clock_in && parseISO(e.clock_in) >= weekStart)
      .map(e => e.job_id)
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="My Hours Today"
        value={hoursToday.toFixed(1)}
        subtext="hours logged"
      />
      <StatCard
        label="My Hours This Week"
        value={hoursWeek.toFixed(1)}
        subtext="hours logged"
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