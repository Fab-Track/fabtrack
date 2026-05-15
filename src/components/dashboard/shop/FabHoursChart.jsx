import React from "react";
import { startOfWeek, parseISO, isAfter } from "date-fns";

export default function FabHoursChart({ jobs, timeEntries }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Sum hours per job this week
  const hoursPerJob = {};
  (timeEntries || []).forEach(entry => {
    if (!entry.clock_in) return;
    const clockIn = parseISO(entry.clock_in);
    if (clockIn < weekStart) return;
    if (!hoursPerJob[entry.job_id]) hoursPerJob[entry.job_id] = 0;
    hoursPerJob[entry.job_id] += entry.duration_hours || 0;
  });

  const activeJobs = jobs.filter(j => j.pipeline_board === "Shop");
  const rows = activeJobs
    .map(j => ({ job: j, hours: Math.round((hoursPerJob[j.id] || 0) * 10) / 10 }))
    .filter(r => r.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 12);

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Fab Hours by Job — This Week</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No hours logged this week</p>
      </div>
    );
  }

  const maxHours = Math.max(...rows.map(r => r.hours), 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Fab Hours by Job — This Week</h3>
      <div className="space-y-2">
        {rows.map(({ job, hours }) => (
          <div key={job.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-muted-foreground shrink-0">{job.job_number}</span>
                <span className="truncate text-foreground">{job.job_name}</span>
              </div>
              <span className="font-mono font-semibold text-foreground ml-2">{hours}h</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(hours / maxHours) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}