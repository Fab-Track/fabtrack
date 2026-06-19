/**
 * ClockWidget — the primary clock-in / clock-out / break control.
 * Used on both the employee Dashboard and the Shop Floor page.
 * Handles all state transitions with guard rails against invalid states.
 */
import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Coffee, UtensilsCrossed, Play, Clock } from "lucide-react";
import { parseISO, format } from "date-fns";
import { getLiveElapsedSeconds, formatHMS, getClockStatus, payPeriodLabel, getWorkweekStart } from "@/lib/timeTrackingHelpers";
import { format as dateFnsFormat } from "date-fns";

// ─── Mutation helpers ─────────────────────────────────────────────────────────
async function doClockIn(employee) {
  const now = new Date();
  return base44.entities.TimeEntry.create({
    organization_id: employee.organization_id,
    employee_id: employee.id,
    employee_name: employee.name,
    entry_type: "shift",
    work_center: employee.work_center_primary || "General",
    clock_in: now.toISOString(),
    is_active: true,
    is_on_break: false,
    break_minutes: 0,
    workweek_start: dateFnsFormat(getWorkweekStart(now, 1), "yyyy-MM-dd"),
    pay_period_label: payPeriodLabel(now),
  });
}

async function doClockOut(entry, user) {
  const now = new Date();
  const clockIn = parseISO(entry.clock_in);
  const grossSecs = Math.max(0, (now - clockIn) / 1000);
  const breakMins = entry.break_minutes || 0;
  // If still on break when clocking out, add that break duration too
  let extraBreakSecs = 0;
  if (entry.is_on_break && entry.break_start) {
    extraBreakSecs = Math.max(0, (now - parseISO(entry.break_start)) / 1000);
  }
  const totalBreakSecs = breakMins * 60 + extraBreakSecs;
  const grossHours = grossSecs / 3600;
  const netHours = Math.max(0, (grossSecs - totalBreakSecs) / 3600);

  await base44.entities.TimeEntry.update(entry.id, {
    clock_out: now.toISOString(),
    duration_hours: Math.round(grossHours * 100) / 100,
    net_hours: Math.round(netHours * 100) / 100,
    break_minutes: Math.round((breakMins * 60 + extraBreakSecs) / 60),
    is_active: false,
    is_on_break: false,
    break_start: null,
  });
}

async function doBreakStart(entry, breakType) {
  const now = new Date();
  return base44.entities.TimeEntry.update(entry.id, {
    is_on_break: true,
    break_start: now.toISOString(),
    break_type: breakType,
  });
}

async function doBreakEnd(entry) {
  const now = new Date();
  const breakStart = parseISO(entry.break_start);
  const addedMins = Math.max(0, (now - breakStart) / (1000 * 60));
  const totalMins = (entry.break_minutes || 0) + addedMins;
  return base44.entities.TimeEntry.update(entry.id, {
    is_on_break: false,
    break_start: null,
    break_type: null,
    break_minutes: Math.round(totalMins * 10) / 10,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClockWidget({ employee, activeEntry, compact = false }) {
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);

  // Live timer
  useEffect(() => {
    if (!activeEntry?.clock_in) { setElapsed(0); return; }
    const tick = () => setElapsed(getLiveElapsedSeconds(activeEntry));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeEntry?.clock_in, activeEntry?.is_on_break, activeEntry?.break_start, activeEntry?.break_minutes]);

  // Break timer
  useEffect(() => {
    if (!activeEntry?.is_on_break || !activeEntry?.break_start) { setBreakElapsed(0); return; }
    const tick = () => {
      const secs = Math.max(0, (Date.now() - parseISO(activeEntry.break_start).getTime()) / 1000);
      setBreakElapsed(Math.floor(secs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeEntry?.is_on_break, activeEntry?.break_start]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["timeEntries"] });

  const clockInMut = useMutation({ mutationFn: () => doClockIn(employee), onSuccess: invalidate });
  const clockOutMut = useMutation({ mutationFn: () => doClockOut(activeEntry), onSuccess: invalidate });
  const breakStartMut = useMutation({ mutationFn: (type) => doBreakStart(activeEntry, type), onSuccess: invalidate });
  const breakEndMut = useMutation({ mutationFn: () => doBreakEnd(activeEntry), onSuccess: invalidate });

  const isBusy = clockInMut.isPending || clockOutMut.isPending || breakStartMut.isPending || breakEndMut.isPending;

  const status = getClockStatus(activeEntry);
  const isActive = !!activeEntry;
  const isOnBreak = isActive && activeEntry.is_on_break;
  const isClockedIn = isActive && !isOnBreak;

  if (!employee) return null;

  // ── Compact mode (for dashboard widget embedding) ──────────────────────────
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Status pill */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${status.bg} ${status.color}`}>
          {isOnBreak ? (
            <Coffee className="w-4 h-4 shrink-0" />
          ) : isActive ? (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          ) : (
            <Clock className="w-4 h-4 shrink-0" />
          )}
          <span>{status.label}</span>
          {isActive && !isOnBreak && (
            <span className="ml-auto font-mono text-xs">{formatHMS(elapsed)}</span>
          )}
          {isOnBreak && (
            <span className="ml-auto font-mono text-xs">{formatHMS(breakElapsed)}</span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 flex-wrap">
          {!isActive && (
            <Button
              className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={() => clockInMut.mutate()}
              disabled={isBusy}
            >
              <LogIn className="w-4 h-4" /> Clock In
            </Button>
          )}
          {isClockedIn && (
            <>
              <Button
                variant="outline"
                className="flex-1 min-h-[44px] gap-1.5"
                onClick={() => breakStartMut.mutate("break")}
                disabled={isBusy}
              >
                <Coffee className="w-4 h-4" /> Break
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-h-[44px] gap-1.5"
                onClick={() => breakStartMut.mutate("lunch")}
                disabled={isBusy}
              >
                <UtensilsCrossed className="w-4 h-4" /> Lunch
              </Button>
              <Button
                className="flex-1 min-h-[44px] bg-red-600 hover:bg-red-700 text-white gap-1.5"
                onClick={() => clockOutMut.mutate()}
                disabled={isBusy}
              >
                <LogOut className="w-4 h-4" /> Clock Out
              </Button>
            </>
          )}
          {isOnBreak && (
            <Button
              className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={() => breakEndMut.mutate()}
              disabled={isBusy}
            >
              <Play className="w-4 h-4" /> Resume Work
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Full-size mode (for Shop Floor / dedicated panel) ──────────────────────
  return (
    <div className="bg-card border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Time Clock</h2>
        {isActive && (
          <Badge variant="outline" className={`${status.color} border-current`}>
            {isOnBreak ? activeEntry.break_type === "lunch" ? "On Lunch" : "On Break" : "Active"}
          </Badge>
        )}
      </div>

      {/* Big status block */}
      <div className={`rounded-lg border p-4 text-center ${status.bg}`}>
        <p className={`text-sm font-medium mb-1 ${status.color}`}>{status.label}</p>
        {isActive && !isOnBreak && (
          <p className="text-4xl font-mono font-bold tracking-tight">{formatHMS(elapsed)}</p>
        )}
        {isOnBreak && (
          <>
            <p className="text-3xl font-mono font-bold tracking-tight text-amber-700">{formatHMS(breakElapsed)}</p>
            <p className="text-xs text-muted-foreground mt-1">break duration</p>
          </>
        )}
        {!isActive && (
          <p className="text-muted-foreground text-sm">Tap Clock In to start your shift</p>
        )}
      </div>

      {/* Action buttons — large mobile targets */}
      <div className="space-y-2">
        {!isActive && (
          <Button
            className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={() => clockInMut.mutate()}
            disabled={isBusy}
          >
            <LogIn className="w-5 h-5" /> Clock In
          </Button>
        )}

        {isClockedIn && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12 text-sm font-medium gap-1.5"
                onClick={() => breakStartMut.mutate("break")}
                disabled={isBusy}
              >
                <Coffee className="w-4 h-4" /> Start Break
              </Button>
              <Button
                variant="outline"
                className="h-12 text-sm font-medium gap-1.5"
                onClick={() => breakStartMut.mutate("lunch")}
                disabled={isBusy}
              >
                <UtensilsCrossed className="w-4 h-4" /> Start Lunch
              </Button>
            </div>
            <Button
              className="w-full h-14 text-base font-semibold bg-red-600 hover:bg-red-700 text-white gap-2"
              onClick={() => clockOutMut.mutate()}
              disabled={isBusy}
            >
              <LogOut className="w-5 h-5" /> Clock Out
            </Button>
          </>
        )}

        {isOnBreak && (
          <Button
            className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={() => breakEndMut.mutate()}
            disabled={isBusy}
          >
            <Play className="w-5 h-5" /> End Break / Resume Work
          </Button>
        )}
      </div>

      {/* Break summary if any breaks taken this shift */}
      {isActive && (activeEntry.break_minutes || 0) > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {Math.round(activeEntry.break_minutes)}m unpaid break taken this shift
        </p>
      )}
    </div>
  );
}