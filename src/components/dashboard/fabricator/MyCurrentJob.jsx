import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Clock, LogIn, UtensilsCrossed, ArrowRightLeft } from "lucide-react";
import { parseISO, startOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export default function MyCurrentJob({ activeEntry, activeElapsedSeconds = 0, allTimeEntries }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const clockOutMutation = useMutation({
    mutationFn: async ({ note } = {}) => {
      const now = new Date();
      const clockIn = new Date(activeEntry.clock_in);
      const duration = (now - clockIn) / (1000 * 60 * 60);
      await base44.entities.TimeEntry.update(activeEntry.id, {
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

  if (!activeEntry) {
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

  // Completed hours on this job today (excluding active)
  const todayStart = startOfDay(new Date());
  const todayCompletedHours = (allTimeEntries || [])
    .filter(e =>
      e.job_id === activeEntry.job_id &&
      e.employee_id === activeEntry.employee_id &&
      !e.is_active &&
      e.clock_in && parseISO(e.clock_in) >= todayStart
    )
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

  const totalTodayHours = todayCompletedHours + activeElapsedSeconds / 3600;

  // All-time completed hours on this job
  const allCompletedHours = (allTimeEntries || [])
    .filter(e => e.job_id === activeEntry.job_id && e.employee_id === activeEntry.employee_id && !e.is_active)
    .reduce((s, e) => s + (e.duration_hours || 0), 0);

  const totalAllHours = allCompletedHours + activeElapsedSeconds / 3600;

  return (
    <div className="bg-card border-2 border-accent rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Currently Clocked In</h3>
        <Badge className="bg-green-100 text-green-700 border-green-200 ml-1">Active</Badge>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <p className="text-3xl font-bold">{activeEntry.job_number}</p>
          <p className="text-xl text-muted-foreground">{activeEntry.work_center}</p>
          <div className="flex items-center gap-2 mt-3">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-2xl font-mono font-bold text-accent">{formatElapsed(activeElapsedSeconds)}</span>
            <span className="text-sm text-muted-foreground">— active now</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Today on this job: <span className="font-semibold text-foreground">{totalTodayHours.toFixed(1)}h</span>
            &nbsp;·&nbsp;All time: <span className="font-semibold text-foreground">{totalAllHours.toFixed(1)}h</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
          <Button
            size="lg"
            onClick={() => clockOutMutation.mutate({})}
            disabled={clockOutMutation.isPending}
            className="min-h-[64px] text-xl px-10 bg-red-600 hover:bg-red-700 text-white w-full"
          >
            <LogOut className="w-6 h-6 mr-3" />
            {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => clockOutMutation.mutate({ note: "Lunch break", afterAction: "none" })}
              disabled={clockOutMutation.isPending}
              className="flex-1 min-h-[48px] gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Lunch
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => clockOutMutation.mutate({ note: "", afterAction: "switch" })}
              disabled={clockOutMutation.isPending}
              className="flex-1 min-h-[48px] gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Switch Job
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}