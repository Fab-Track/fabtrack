import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Wrench } from "lucide-react";
import { formatDistanceToNow, parseISO, startOfWeek } from "date-fns";

export default function ShopSnapshot({ timeEntries, allTimeEntries, jobs, employees }) {
  const active = (timeEntries || []).filter(t => t.is_active);
  const inFab = (jobs || []).filter(j => j.status === "In Fabrication" || (j.pipeline_board === "Shop" && (j.stage || "").includes("Fabrication")));

  // Hours this week per active employee
  const weekStart = startOfWeek(new Date());
  const activeEmployeeIds = new Set(active.map(t => t.employee_id));

  const weeklyCapacity = (employees || [])
    .filter(e => e.is_active && activeEmployeeIds.has(e.id))
    .map(emp => {
      const hrs = (allTimeEntries || []).filter(t => {
        if (t.employee_id !== emp.id) return false;
        const d = t.clock_in ? parseISO(t.clock_in) : null;
        return d && d >= weekStart;
      }).reduce((s, t) => s + (t.duration_hours || 0), 0);
      return { name: emp.preferred_name || emp.name, hours: parseFloat(hrs.toFixed(1)), target: 40 };
    });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Shop Snapshot</h3>

      {/* Who's clocked in */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live — {active.length} Clocked In</span>
        </div>
        {active.length === 0 ? (
          <p className="text-xs text-muted-foreground pl-4">No one clocked in right now</p>
        ) : (
          active.map(entry => (
            <div key={entry.id} className="flex items-center gap-2 pl-4 text-xs">
              <User className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="font-medium">{entry.employee_name}</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0">{entry.work_center}</Badge>
              <span className="text-muted-foreground">{entry.job_number}</span>
            </div>
          ))
        )}
      </div>

      {/* In Fabrication */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Fabrication ({inFab.length})</span>
        </div>
        {inFab.slice(0, 4).map(j => (
          <div key={j.id} className="flex items-center justify-between pl-5 text-xs">
            <span className="text-muted-foreground truncate max-w-[160px]">{j.job_name}</span>
            <span className="font-mono text-muted-foreground">{j.job_number}</span>
          </div>
        ))}
        {inFab.length > 4 && <p className="pl-5 text-xs text-muted-foreground">+{inFab.length - 4} more</p>}
        {inFab.length === 0 && <p className="pl-5 text-xs text-muted-foreground">No jobs currently in fabrication</p>}
      </div>

      {/* Weekly capacity */}
      {weeklyCapacity.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hours This Week</p>
          {weeklyCapacity.map(emp => (
            <div key={emp.name} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{emp.name}</span>
                <span className="font-mono">{emp.hours}/{emp.target}h</span>
              </div>
              <Progress value={(emp.hours / emp.target) * 100} className="h-1.5" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}