/**
 * LiveStatusTable — shows all employees and their current clock status in real-time.
 */
import React, { useEffect, useState } from "react";
import { differenceInSeconds, parseISO, format } from "date-fns";
import { formatHMS, getNetHours, getLiveElapsedSeconds } from "@/lib/timeTrackingHelpers";
import { Badge } from "@/components/ui/badge";
import { Coffee, LogIn, LogOut, Clock } from "lucide-react";

export default function LiveStatusTable({ employees, activeEntries = [], allEntries = [] }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();

  return (
    <div className="space-y-2">
      {employees.map(emp => {
        const active = activeEntries.find(e => e.employee_id === emp.id);
        const isOnBreak = active?.is_on_break;
        const liveWorkedSecs = active ? getLiveElapsedSeconds(active) : 0;

        // Today completed hours
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayCompleted = allEntries
          .filter(e => e.employee_id === emp.id && !e.is_active && e.clock_in && parseISO(e.clock_in) >= todayStart)
          .reduce((s, e) => s + getNetHours(e), 0);
        const todayTotal = todayCompleted + liveWorkedSecs / 3600;

        return (
          <div key={emp.id} className={`flex items-center justify-between p-3 rounded-xl border gap-3 ${active ? "bg-green-50 border-green-200" : "bg-card"}`}>
            <div className="flex items-center gap-3 min-w-0">
              {active ? (
                isOnBreak ? (
                  <Coffee className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                )
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{emp.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{emp.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {active && !isOnBreak && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-sm font-mono font-semibold text-green-700">{formatHMS(liveWorkedSecs)}</p>
                </div>
              )}
              {active && isOnBreak && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                  {active.break_type === "lunch" ? "Lunch" : "Break"}
                </Badge>
              )}
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-sm font-semibold">{todayTotal > 0 ? `${todayTotal.toFixed(1)}h` : "—"}</p>
              </div>
              {active ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs whitespace-nowrap">
                  In since {active.clock_in ? format(parseISO(active.clock_in), "h:mm a") : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Out</Badge>
              )}
            </div>
          </div>
        );
      })}
      {employees.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">No employees found</p>
      )}
    </div>
  );
}