import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut, Clock } from "lucide-react";
import { parseISO, differenceInSeconds, startOfDay } from "date-fns";

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export default function MyCurrentJob({ activeEntry, allTimeEntries, onClockOut }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeEntry?.clock_in) return;
    const update = () => {
      const secs = differenceInSeconds(new Date(), parseISO(activeEntry.clock_in));
      setElapsed(Math.max(0, secs));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeEntry?.clock_in]);

  const queryClient = useQueryClient();
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const clockIn = new Date(activeEntry.clock_in);
      const duration = (now - clockIn) / (1000 * 60 * 60);
      await base44.entities.TimeEntry.update(activeEntry.id, {
        clock_out: now.toISOString(),
        duration_hours: Math.round(duration * 100) / 100,
        is_active: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      if (onClockOut) onClockOut();
    },
  });

  if (!activeEntry) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">My Current Job</h3>
        <p className="text-muted-foreground text-center py-8 text-lg">Not currently clocked in</p>
      </div>
    );
  }

  // Total hours on this job across all sessions (completed)
  const completedHours = (allTimeEntries || [])
    .filter(e => e.job_id === activeEntry.job_id && e.employee_id === activeEntry.employee_id && !e.is_active)
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

  // Today hours on this job
  const todayStart = startOfDay(new Date());
  const todayHours = (allTimeEntries || [])
    .filter(e =>
      e.job_id === activeEntry.job_id &&
      e.employee_id === activeEntry.employee_id &&
      !e.is_active &&
      e.clock_in && parseISO(e.clock_in) >= todayStart
    )
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

  return (
    <div className="bg-card border-2 border-accent rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Currently Clocked In</h3>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <p className="text-3xl font-bold">{activeEntry.job_number}</p>
          <p className="text-xl text-muted-foreground">{activeEntry.work_center}</p>
          <div className="flex items-center gap-2 mt-3">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-2xl font-mono font-bold text-accent">{formatElapsed(elapsed)}</span>
            <span className="text-sm text-muted-foreground">this session</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Today on this job: <span className="font-semibold text-foreground">{(todayHours + elapsed / 3600).toFixed(1)}h</span>
            &nbsp;·&nbsp;All time: <span className="font-semibold text-foreground">{(completedHours + elapsed / 3600).toFixed(1)}h</span>
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => clockOutMutation.mutate()}
          disabled={clockOutMutation.isPending}
          className="min-h-[64px] text-xl px-10 bg-red-600 hover:bg-red-700 text-white shrink-0"
        >
          <LogOut className="w-6 h-6 mr-3" />
          {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
        </Button>
      </div>
    </div>
  );
}