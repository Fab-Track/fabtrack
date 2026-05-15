import React from "react";
import { startOfWeek, parseISO } from "date-fns";

const TARGET_HOURS = 40;

export default function TeamUtilizationWidget({ employees, timeEntries }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const fabricators = (employees || []).filter(e =>
    e.is_active !== false && ["welder","fitter","cutter","grinder","foreman","installer"].includes(e.role)
  );

  const hoursMap = {};
  fabricators.forEach(e => { hoursMap[e.id] = 0; });

  (timeEntries || []).forEach(entry => {
    if (!entry.clock_in) return;
    const clockIn = parseISO(entry.clock_in);
    if (clockIn < weekStart) return;
    if (hoursMap[entry.employee_id] !== undefined) {
      hoursMap[entry.employee_id] += entry.duration_hours || 0;
    }
  });

  if (fabricators.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Team Utilization This Week</h3>
        <p className="text-sm text-muted-foreground text-center py-6">No active fabricators found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Team Utilization This Week</h3>
        <span className="text-xs text-muted-foreground">Target: 40h</span>
      </div>
      <div className="space-y-2.5">
        {fabricators.map(emp => {
          const hours = Math.round((hoursMap[emp.id] || 0) * 10) / 10;
          const pct = Math.min((hours / TARGET_HOURS) * 100, 100);
          const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-400" : "bg-red-500";
          const labelColor = pct >= 75 ? "text-emerald-600" : pct >= 40 ? "text-yellow-600" : "text-red-600";

          return (
            <div key={emp.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{emp.name}</span>
                <span className={`font-mono font-semibold ${labelColor}`}>{hours}h</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}