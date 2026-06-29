/**
 * MasterClockCard — The employee's primary PAYROLL clock.
 * Records when they arrive at / leave the shop each day.
 * This is the source of truth for total paid hours.
 * It is SEPARATE from the job-level clock on the Shop Floor.
 */
import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Coffee, UtensilsCrossed, Play, Building2 } from "lucide-react";
import { parseISO, format } from "date-fns";
import {
  getLiveElapsedSeconds,
  formatHMS,
  payPeriodLabel,
  getWorkweekStart,
} from "@/lib/timeTrackingHelpers";

// ─── Mutation helpers ─────────────────────────────────────────────────────────
async function doClockIn(employee) {
  const now = new Date();
  return base44.entities.TimeEntry.create({
    organization_id: employee.organization_id,
    employee_id: employee.id || null,
    employee_name: employee.name,
    employee_email: employee.email || employee.user_email || null,
    entry_type: "shift",
    work_center: employee.work_center_primary || "General",
    // No job_id — this is the master/payroll clock
    clock_in: now.toISOString(),
    is_active: true,
    is_on_break: false,
    break_minutes: 0,
    workweek_start: format(getWorkweekStart(now, 1), "yyyy-MM-dd"),
    pay_period_label: payPeriodLabel(now),
  });
}

async function doClockOut(entry) {
  const now = new Date();
  const clockIn = parseISO(entry.clock_in);
  const grossSecs = Math.max(0, (now - clockIn) / 1000);
  let extraBreakSecs = 0;
  if (entry.is_on_break && entry.break_start) {
    extraBreakSecs = Math.max(0, (now - parseISO(entry.break_start)) / 1000);
  }
  const totalBreakSecs = (entry.break_minutes || 0) * 60 + extraBreakSecs;
  const grossHours = grossSecs / 3600;
  const netHours = Math.max(0, (grossSecs - totalBreakSecs) / 3600);

  // Stop the master clock
  await base44.entities.TimeEntry.update(entry.id, {
    clock_out: now.toISOString(),
    duration_hours: Math.round(grossHours * 100) / 100,
    net_hours: Math.round(netHours * 100) / 100,
    break_minutes: Math.round(((entry.break_minutes || 0) * 60 + extraBreakSecs) / 60),
    is_active: false,
    is_on_break: false,
    break_start: null,
  });

  // Auto-stop any active job clock entries for this employee
  const activeJobEntries = await base44.entities.TimeEntry.filter({
    employee_id: entry.employee_id,
    is_active: true,
  });
  for (const jobEntry of activeJobEntries) {
    if (jobEntry.job_id) {
      const jGrossSecs = Math.max(0, (now - parseISO(jobEntry.clock_in)) / 1000);
      // Finalize accumulated break time (including ongoing pause)
      let jobBreakSecs = (jobEntry.break_minutes || 0) * 60;
      if (jobEntry.is_on_break && jobEntry.break_start) {
        jobBreakSecs += Math.max(0, (now - parseISO(jobEntry.break_start)) / 1000);
      }
      const jNetSecs = Math.max(0, jGrossSecs - jobBreakSecs);
      await base44.entities.TimeEntry.update(jobEntry.id, {
        clock_out: now.toISOString(),
        duration_hours: Math.round((jGrossSecs / 3600) * 100) / 100,
        net_hours: Math.round((jNetSecs / 3600) * 100) / 100,
        is_active: false,
        is_on_break: false,
        break_start: null,
        break_minutes: Math.round(jobBreakSecs / 60),
        notes: "Auto-stopped: master clock out",
      });
    }
  }
}

async function doBreakStart(entry, breakType) {
  return base44.entities.TimeEntry.update(entry.id, {
    is_on_break: true,
    break_start: new Date().toISOString(),
    break_type: breakType,
  });
}

async function doBreakEnd(entry) {
  const now = new Date();
  const addedMins = Math.max(0, (now - parseISO(entry.break_start)) / (1000 * 60));
  const totalMins = (entry.break_minutes || 0) + addedMins;
  return base44.entities.TimeEntry.update(entry.id, {
    is_on_break: false,
    break_start: null,
    break_type: null,
    break_minutes: Math.round(totalMins * 10) / 10,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MasterClockCard({ employee, masterEntry }) {
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);

  // Live shift timer
  useEffect(() => {
    if (!masterEntry?.clock_in) { setElapsed(0); return; }
    const tick = () => setElapsed(getLiveElapsedSeconds(masterEntry));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [masterEntry?.clock_in, masterEntry?.is_on_break, masterEntry?.break_start, masterEntry?.break_minutes]);

  // Live break timer
  useEffect(() => {
    if (!masterEntry?.is_on_break || !masterEntry?.break_start) { setBreakElapsed(0); return; }
    const tick = () => {
      const secs = Math.max(0, (Date.now() - parseISO(masterEntry.break_start).getTime()) / 1000);
      setBreakElapsed(Math.floor(secs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [masterEntry?.is_on_break, masterEntry?.break_start]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["timeEntries"] });

  const clockInMut   = useMutation({ mutationFn: () => doClockIn(employee), onSuccess: invalidate });
  const clockOutMut  = useMutation({ mutationFn: () => doClockOut(masterEntry), onSuccess: invalidate });
  const breakStartMut = useMutation({ mutationFn: (type) => doBreakStart(masterEntry, type), onSuccess: invalidate });
  const breakEndMut  = useMutation({ mutationFn: () => doBreakEnd(masterEntry), onSuccess: invalidate });

  const isBusy = clockInMut.isPending || clockOutMut.isPending || breakStartMut.isPending || breakEndMut.isPending;

  const isClockedIn = !!masterEntry && !masterEntry.is_on_break;
  const isOnBreak   = !!masterEntry?.is_on_break;
  const clockInTime = masterEntry?.clock_in ? format(parseISO(masterEntry.clock_in), "h:mm a") : null;

  if (!employee) return null;

  return (
    <div className="bg-card border-2 rounded-xl p-5 space-y-4 border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">Daily Payroll Clock</p>
            <p className="text-xs text-muted-foreground">Clock in when you arrive · Clock out when you leave</p>
          </div>
        </div>
        {masterEntry && (
          <Badge
            className={
              isOnBreak
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-green-100 text-green-700 border-green-200"
            }
          >
            {isOnBreak
              ? masterEntry.break_type === "lunch" ? "On Lunch" : "On Break"
              : "Clocked In"}
          </Badge>
        )}
      </div>

      {/* Big status area */}
      <div
        className={`rounded-lg border p-4 text-center ${
          isOnBreak
            ? "bg-amber-50 border-amber-200"
            : isClockedIn
            ? "bg-green-50 border-green-200"
            : "bg-muted/40 border-border"
        }`}
      >
        {isClockedIn && !isOnBreak && (
          <>
            <p className="text-sm font-medium text-green-700 mb-1">
              Clocked in since {clockInTime}
            </p>
            <p className="text-4xl font-mono font-bold tracking-tight text-green-800">
              {formatHMS(elapsed)}
            </p>
          </>
        )}
        {isOnBreak && (
          <>
            <p className="text-sm font-medium text-amber-700 mb-1">
              {masterEntry.break_type === "lunch" ? "On Lunch" : "On Break"} — since{" "}
              {masterEntry.break_start ? format(parseISO(masterEntry.break_start), "h:mm a") : ""}
            </p>
            <p className="text-3xl font-mono font-bold tracking-tight text-amber-700">
              {formatHMS(breakElapsed)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">break duration (unpaid)</p>
          </>
        )}
        {!masterEntry && (
          <p className="text-muted-foreground text-sm py-2">
            Not clocked in · Tap <strong>Clock In for the Day</strong> to start your shift
          </p>
        )}
      </div>

      {/* Action buttons — large mobile targets */}
      <div className="space-y-2">
        {!masterEntry && (
          <Button
            className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={() => clockInMut.mutate()}
            disabled={isBusy}
          >
            <LogIn className="w-5 h-5" />
            Clock In for the Day
          </Button>
        )}

        {isClockedIn && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12 font-medium gap-1.5"
                onClick={() => breakStartMut.mutate("break")}
                disabled={isBusy}
              >
                <Coffee className="w-4 h-4" /> Start Break
              </Button>
              <Button
                variant="outline"
                className="h-12 font-medium gap-1.5"
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
              <LogOut className="w-5 h-5" /> Clock Out for the Day
            </Button>
          </>
        )}

        {isOnBreak && (
          <Button
            className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={() => breakEndMut.mutate()}
            disabled={isBusy}
          >
            <Play className="w-5 h-5" /> End Break · Back to Work
          </Button>
        )}
      </div>

      {/* Break summary */}
      {masterEntry && (masterEntry.break_minutes || 0) > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {Math.round(masterEntry.break_minutes)}m unpaid break taken today
        </p>
      )}
    </div>
  );
}