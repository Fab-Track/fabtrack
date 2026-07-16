/**
 * JobClockSection — Inline job clock-in/out on the Time Card / Dashboard.
 *
 * One-at-a-time rule: only one job clock can be running at any time.
 * Clocking into a new job auto-pauses any currently running job.
 * Resuming a paused job auto-pauses any other running job first.
 * Paused jobs stay in the list with a "Paused" badge and a Resume button.
 *
 * Activities: Measure, Draw, Cut, Fab, Install (only).
 */
import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LogOut, LogIn, Clock, Search, Briefcase, AlertTriangle, X, Play } from "lucide-react";
import { parseISO, differenceInSeconds, format } from "date-fns";
import { payPeriodLabel, getWorkweekStart, getLiveElapsedSeconds } from "@/lib/timeTrackingHelpers";

const ACTIVITIES = ["Measure", "Draw", "Cut", "Fab", "Install"];

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

// Pause a running job entry — set break state (stops the live timer)
async function pauseEntry(entry, now) {
  if (entry.is_on_break) return;
  return base44.entities.TimeEntry.update(entry.id, {
    is_on_break: true,
    break_start: now.toISOString(),
  });
}

// Resume a paused job entry — accumulate break_minutes, clear break state
async function resumeEntry(entry, now) {
  if (!entry.is_on_break) return;
  let additionalBreak = 0;
  if (entry.break_start) {
    additionalBreak = differenceInSeconds(now, parseISO(entry.break_start)) / 60;
  }
  return base44.entities.TimeEntry.update(entry.id, {
    is_on_break: false,
    break_start: null,
    master_paused: false,
    break_minutes: Math.round((entry.break_minutes || 0) + additionalBreak),
  });
}

function ActiveJobCard({ entry, job, onClockOut, onResume, isPending }) {
  const [elapsed, setElapsed] = useState(0);
  const isPaused = !!entry.is_on_break;

  useEffect(() => {
    // getLiveElapsedSeconds accounts for break_minutes + ongoing break
    const tick = () => {
      setElapsed(getLiveElapsedSeconds(entry));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [entry]);

  const jobName = job?.job_name || entry.job_number || "Unknown Job";
  const jobNumber = job?.job_number || entry.job_number || "";

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card ${isPaused ? "border-amber-300 bg-amber-50/40" : ""}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono text-muted-foreground">{jobNumber}</span>
          <Badge className="bg-green-100 text-green-700 border-green-200">{entry.work_center}</Badge>
          {isPaused && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">Paused</Badge>
          )}
        </div>
        <p className="text-base font-semibold text-foreground">{jobName}</p>
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isPaused ? "text-amber-500" : "text-accent"}`} />
          <span className={`text-lg font-mono font-bold ${isPaused ? "text-amber-600" : "text-accent"}`}>{formatElapsed(elapsed)}</span>
          <span className="text-sm text-muted-foreground">— {isPaused ? "paused" : "active now"}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {isPaused && (
          <Button
            size="sm"
            onClick={() => onResume(entry)}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Play className="w-4 h-4" />
            Resume
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => onClockOut(entry)}
          disabled={isPending}
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50 gap-2"
        >
          <LogOut className="w-4 h-4" />
          Clock Out
        </Button>
      </div>
    </div>
  );
}

export default function JobClockSection({ employee, masterEntry, activeEntries = [], allTimeEntries, jobs = [] }) {
  const queryClient = useQueryClient();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  // Running = not on break (timer ticking); these get auto-paused before a new/resumed clock starts
  const runningEntries = activeEntries.filter(e => !e.is_on_break);

  const clockInJobMutation = useMutation({
    mutationFn: async ({ job, activity, entriesToPause }) => {
      const now = new Date();
      // Pause all currently running job entries before starting the new one
      await Promise.all((entriesToPause || []).map(e => pauseEntry(e, now)));
      return base44.entities.TimeEntry.create({
        organization_id: employee.organization_id,
        employee_id: employee.id || null,
        employee_name: employee.name,
        employee_email: employee.email || null,
        job_id: job.id,
        job_number: job.job_number || "",
        work_center: activity,
        entry_type: "shift",
        clock_in: now.toISOString(),
        is_active: true,
        is_on_break: false,
        break_minutes: 0,
        workweek_start: format(getWorkweekStart(now, 1), "yyyy-MM-dd"),
        pay_period_label: payPeriodLabel(now),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      setSelectedJob(null);
      setSearchQuery("");
      setShowSearch(false);
    },
  });

  const clockOutJobMutation = useMutation({
    mutationFn: async (entry) => {
      const now = new Date();
      const clockIn = parseISO(entry.clock_in);
      const duration = differenceInSeconds(now, clockIn) / 3600;
      // Finalize break time if currently paused
      let breakMinutes = entry.break_minutes || 0;
      if (entry.is_on_break && entry.break_start) {
        breakMinutes += differenceInSeconds(now, parseISO(entry.break_start)) / 60;
      }
      await base44.entities.TimeEntry.update(entry.id, {
        clock_out: now.toISOString(),
        duration_hours: Math.round(duration * 100) / 100,
        is_active: false,
        is_on_break: false,
        break_start: null,
        break_minutes: Math.round(breakMinutes),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    },
  });

  const resumeJobMutation = useMutation({
    mutationFn: async ({ entry, entriesToPause }) => {
      const now = new Date();
      // Pause all currently running job entries first (one-at-a-time rule)
      await Promise.all((entriesToPause || []).map(e => pauseEntry(e, now)));
      // Resume the target entry
      return resumeEntry(entry, now);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    },
  });

  const isBusy = clockInJobMutation.isPending || clockOutJobMutation.isPending || resumeJobMutation.isPending;

  // Not clocked in for the day — show warning
  if (!masterEntry) {
    return (
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Clock Into a Job</h3>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mt-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Clock in for the day first before clocking into a job.
        </div>
      </div>
    );
  }

  // Filter jobs for search — exclude archived and completed statuses
  const STAGE_EXCLUDE = ["Invoiced", "Install Complete"];
  const searchableJobs = jobs.filter(j => !STAGE_EXCLUDE.includes(j.status) && !j.is_archived);
  const searchLower = searchQuery.toLowerCase();
  const filteredJobs = searchLower
    ? searchableJobs.filter(j => {
        const jobNumber = (j.job_number || "").toLowerCase();
        const jobName = (j.job_name || "").toLowerCase();
        const customerName = (j.customer_name || "").toLowerCase();
        return jobNumber.includes(searchLower) || jobName.includes(searchLower) || customerName.includes(searchLower);
      })
    : searchableJobs.slice(0, 10);

  // Badge counts
  const pausedCount = activeEntries.length - runningEntries.length;

  return (
    <div className="bg-card border-2 border-accent/30 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Clock Into a Job</h3>
          {activeEntries.length > 0 && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              {activeEntries.length} open · {runningEntries.length} running{pausedCount > 0 ? ` · ${pausedCount} paused` : ""}
            </Badge>
          )}
        </div>
        {!showSearch && (
          <Button variant="outline" size="sm" onClick={() => setShowSearch(true)} className="gap-2 min-h-[44px]">
            <LogIn className="w-4 h-4" />
            Clock Into a Job
          </Button>
        )}
      </div>

      {/* Active job cards — running first, then paused */}
      {activeEntries.length > 0 && (
        <div className="space-y-3">
          {[...activeEntries].sort((a, b) => (a.is_on_break ? 1 : 0) - (b.is_on_break ? 1 : 0)).map(entry => (
            <ActiveJobCard
              key={entry.id}
              entry={entry}
              job={jobs.find(j => j.id === entry.job_id)}
              onClockOut={(e) => clockOutJobMutation.mutate(e)}
              onResume={(e) => resumeJobMutation.mutate({
                entry: e,
                entriesToPause: activeEntries.filter(other => other.id !== e.id && !other.is_on_break),
              })}
              isPending={isBusy}
            />
          ))}
        </div>
      )}

      {/* Inline job search + activity selection */}
      {showSearch && (
        <div className="space-y-4 border-t pt-4">
          {!selectedJob ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Search for a job</p>
                <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by job #, name, or customer..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No jobs found</p>
                ) : (
                  filteredJobs.map(job => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="w-full p-3 rounded-lg border hover:border-accent hover:bg-accent/5 text-left transition-all min-h-[44px]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                        <Badge variant="outline" className="text-xs">{job.status}</Badge>
                      </div>
                      <p className="text-sm font-semibold">{job.job_name}</p>
                      <p className="text-xs text-muted-foreground">{job.customer_name}</p>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Select activity for {selectedJob.job_number}</p>
                <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <span className="text-xs font-mono text-muted-foreground">{selectedJob.job_number}</span>
                <p className="text-sm font-semibold">{selectedJob.job_name}</p>
                <p className="text-xs text-muted-foreground">{selectedJob.customer_name}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ACTIVITIES.map(activity => (
                  <Button
                    key={activity}
                    variant="outline"
                    onClick={() => clockInJobMutation.mutate({
                      job: selectedJob,
                      activity,
                      entriesToPause: runningEntries,
                    })}
                    disabled={isBusy}
                    className="h-14 font-semibold gap-1.5 min-h-[44px]"
                  >
                    {activity}
                  </Button>
                ))}
              </div>
              {clockInJobMutation.isError && (
                <p className="text-sm text-destructive">
                  {clockInJobMutation.error?.response?.data?.error || clockInJobMutation.error?.message || "Failed to clock in"}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}