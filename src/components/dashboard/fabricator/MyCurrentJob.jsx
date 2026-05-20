import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Clock, LogIn, UtensilsCrossed, ArrowRightLeft } from "lucide-react";
import { parseISO, startOfDay, differenceInSeconds } from "date-fns";
import { useNavigate } from "react-router-dom";

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function ActiveJobRow({ entry, allTimeEntries, jobs = [], onClockOut, isPending }) {
  const job = jobs.find(j => j.id === entry.job_id);
  const todayStart = startOfDay(new Date());
  const elapsedSeconds = entry.clock_in
    ? Math.max(0, differenceInSeconds(new Date(), parseISO(entry.clock_in)))
    : 0;

  const todayCompletedHours = (allTimeEntries || [])
    .filter(e =>
      e.job_id === entry.job_id &&
      e.employee_id === entry.employee_id &&
      !e.is_active &&
      e.clock_in && parseISO(e.clock_in) >= todayStart
    )
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

  const totalTodayHours = todayCompletedHours + elapsedSeconds / 3600;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b last:border-0">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold">{entry.job_number}</p>
          <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
        </div>
        {job && <p className="text-base font-semibold text-foreground">{job.job_name}</p>}
        <p className="text-base text-muted-foreground">{entry.work_center}</p>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <span className="text-lg font-mono font-bold text-accent">{formatElapsed(elapsedSeconds)}</span>
          <span className="text-sm text-muted-foreground">— active now</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Today on this job: <span className="font-semibold text-foreground">{totalTodayHours.toFixed(1)}h</span>
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => onClockOut(entry)}
        disabled={isPending}
        className="bg-red-600 hover:bg-red-700 text-white gap-2 shrink-0"
      >
        <LogOut className="w-4 h-4" />
        Clock Out
      </Button>
    </div>
  );
}

export default function MyCurrentJob({ activeEntries = [], activeElapsedSeconds = 0, allTimeEntries, jobs = [] }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Keep backward compat: also accept single activeEntry
  const activeEntry = activeEntries[0] || null;

  const clockOutMutation = useMutation({
    mutationFn: async ({ entry, note } = {}) => {
      const now = new Date();
      const clockIn = new Date(entry.clock_in);
      const duration = (now - clockIn) / (1000 * 60 * 60);
      await base44.entities.TimeEntry.update(entry.id, {
        clock_out: now.toISOString(),
        duration_hours: Math.round(duration * 100) / 100,
        is_active: false,
        ...(note ? { notes: note } : {}),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      if (variables?.afterAction === "switch") navigate("/kiosk");
    },
  });

  const clockOutAll = async (note, afterAction) => {
    for (const entry of activeEntries) {
      const now = new Date();
      const clockIn = new Date(entry.clock_in);
      const duration = (now - clockIn) / (1000 * 60 * 60);
      await base44.entities.TimeEntry.update(entry.id, {
        clock_out: now.toISOString(),
        duration_hours: Math.round(duration * 100) / 100,
        is_active: false,
        ...(note ? { notes: note } : {}),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    if (afterAction === "switch") navigate("/kiosk");
  };

  if (activeEntries.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">My Current Job</h3>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
          <p className="text-muted-foreground text-lg">Not currently clocked in</p>
          <Button variant="outline" onClick={() => navigate("/kiosk")} className="gap-2">
            <LogIn className="w-4 h-4" />
            Go to Shop Floor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border-2 border-accent rounded-xl p-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Currently Clocked In</h3>
        {activeEntries.length > 1 && (
          <Badge className="bg-green-100 text-green-700 border-green-200 ml-1">{activeEntries.length} active</Badge>
        )}
      </div>

      {/* List of active jobs */}
      <div className="divide-y">
        {activeEntries.map(entry => (
          <ActiveJobRow
            key={entry.id}
            entry={entry}
            allTimeEntries={allTimeEntries}
            jobs={jobs}
            onClockOut={(e) => clockOutMutation.mutate({ entry: e })}
            isPending={clockOutMutation.isPending}
          />
        ))}
      </div>

      {/* Shared action buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button
          variant="outline"
          size="lg"
          onClick={() => clockOutAll("Lunch break", "none")}
          disabled={clockOutMutation.isPending}
          className="flex-1 min-h-[48px] gap-2"
        >
          <UtensilsCrossed className="w-4 h-4" />
          Lunch {activeEntries.length > 1 ? "(Clock Out All)" : ""}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => clockOutAll("", "switch")}
          disabled={clockOutMutation.isPending}
          className="flex-1 min-h-[48px] gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Switch Job
        </Button>
      </div>
    </div>
  );
}