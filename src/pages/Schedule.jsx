import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  format, parseISO, isValid, differenceInCalendarDays,
  addDays, eachDayOfInterval, startOfDay, isSameDay,
} from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPhaseColors } from "@/lib/scheduleHelpers";
import { ChevronLeft, ChevronRight, Filter, Users, CalendarDays } from "lucide-react";

const TODAY = startOfDay(new Date());
const WINDOW_DAYS = 56; // 8-week view

function getVisibleWindow(offset) {
  const start = addDays(TODAY, offset);
  const end = addDays(start, WINDOW_DAYS - 1);
  return { start, end };
}

// How many jobs are in "Fabrication" phase on each day — for heatmap
function buildHeatmap(jobs, start, end) {
  const days = eachDayOfInterval({ start, end });
  const map = {};
  days.forEach(d => { map[format(d, "yyyy-MM-dd")] = 0; });

  jobs.forEach(job => {
    const fabPhase = (job.schedule_phases || []).find(p => p.name === "Fabrication");
    if (!fabPhase) return;
    const s = parseISO(fabPhase.startDate);
    const e = parseISO(fabPhase.endDate);
    days.forEach(d => {
      if (d >= s && d <= e) {
        const key = format(d, "yyyy-MM-dd");
        if (map[key] !== undefined) map[key]++;
      }
    });
  });

  const max = Math.max(1, ...Object.values(map));
  return { map, max };
}

function HeatmapRow({ heatmap, days }) {
  return (
    <div className="flex ml-52 mb-1 gap-px">
      {days.map(d => {
        const key = format(d, "yyyy-MM-dd");
        const val = heatmap.map[key] || 0;
        const ratio = val / heatmap.max;
        let bg = "bg-emerald-100";
        if (ratio > 0.66) bg = "bg-red-400";
        else if (ratio > 0.33) bg = "bg-amber-300";
        else if (ratio > 0) bg = "bg-emerald-300";
        return (
          <div
            key={key}
            title={`${format(d, "MMM d")}: ${val} job(s) in fab`}
            className={`h-3 flex-1 rounded-sm ${bg} transition-colors`}
          />
        );
      })}
    </div>
  );
}

function JobGanttRow({ job, days, windowStart, windowEnd }) {
  const phases = job.schedule_phases || [];
  const totalDays = WINDOW_DAYS;

  return (
    <Link
      to={`/jobs/${job.id}?from=schedule`}
      className="flex items-center h-10 hover:bg-muted/40 transition-colors border-b border-border/30 group"
    >
      {/* Job label */}
      <div className="w-52 shrink-0 px-3 flex flex-col justify-center">
        <div className="text-xs font-medium truncate group-hover:text-accent transition-colors">{job.job_name}</div>
        <div className="text-[10px] text-muted-foreground font-mono truncate">{job.job_number}</div>
      </div>

      {/* Phase bars */}
      <div className="flex-1 relative h-6 mx-1">
        {phases.map(phase => {
          const s = parseISO(phase.startDate);
          const e = parseISO(phase.endDate);
          if (e < windowStart || s > windowEnd) return null;

          const clampedStart = s < windowStart ? windowStart : s;
          const clampedEnd = e > windowEnd ? windowEnd : e;

          const leftPct = (differenceInCalendarDays(clampedStart, windowStart) / totalDays) * 100;
          const widthPct = Math.max(0.5, ((differenceInCalendarDays(clampedEnd, clampedStart) + 1) / totalDays) * 100);
          const colors = getPhaseColors(phase.color);
          const faded = phase.status === "complete";

          return (
            <div
              key={phase.name}
              title={`${phase.name}: ${format(s, "MMM d")} – ${format(e, "MMM d")}`}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              className={`absolute h-full rounded-sm ${colors.bg} ${faded ? "opacity-30" : "opacity-80"} hover:opacity-100 transition-opacity`}
            />
          );
        })}

        {/* Today line */}
        {TODAY >= windowStart && TODAY <= windowEnd && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${(differenceInCalendarDays(TODAY, windowStart) / totalDays) * 100}%` }}
          />
        )}
      </div>

      {/* Install date */}
      <div className="w-20 shrink-0 text-[10px] text-muted-foreground text-right pr-3">
        {job.promised_install_date
          ? format(parseISO(job.promised_install_date), "MMM d")
          : job.expected_install_date
            ? format(parseISO(job.expected_install_date), "MMM d")
            : "—"}
      </div>
    </Link>
  );
}

export default function Schedule() {
  const [dayOffset, setDayOffset] = useState(0);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [crewFilter, setCrewFilter] = useState("all");

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const { start: windowStart, end: windowEnd } = getVisibleWindow(dayOffset);
  const days = eachDayOfInterval({ start: windowStart, end: windowEnd });

  // All unique crew members
  const allCrew = useMemo(() => {
    const names = new Set();
    jobs.forEach(j => (j.assigned_crew_names || []).forEach(n => names.add(n)));
    return [...names].sort();
  }, [jobs]);

  // Jobs with a schedule (or at least an install date) that fall in this window
  const visibleJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!job.schedule_phases?.length && !job.promised_install_date && !job.expected_install_date) return false;

      // Window overlap check
      const installStr = job.promised_install_date || job.expected_install_date;
      if (job.schedule_phases?.length > 0) {
        const first = parseISO(job.schedule_phases[0].startDate);
        const last = parseISO(job.schedule_phases[job.schedule_phases.length - 1].endDate);
        if (last < windowStart || first > windowEnd) return false;
      } else if (installStr) {
        const d = parseISO(installStr);
        if (d < windowStart || d > windowEnd) return false;
      } else return false;

      // Phase filter
      if (phaseFilter !== "all") {
        const hasPhase = (job.schedule_phases || []).some(p => p.name === phaseFilter && p.status !== "complete");
        if (!hasPhase) return false;
      }

      // Type filter
      if (typeFilter !== "all" && job.job_type !== typeFilter) return false;

      // Crew filter
      if (crewFilter !== "all" && !(job.assigned_crew_names || []).includes(crewFilter)) return false;

      return true;
    }).sort((a, b) => {
      const da = a.promised_install_date || a.expected_install_date || "9999";
      const db = b.promised_install_date || b.expected_install_date || "9999";
      return da.localeCompare(db);
    });
  }, [jobs, windowStart, windowEnd, phaseFilter, typeFilter, crewFilter]);

  const heatmap = useMemo(() => buildHeatmap(visibleJobs, windowStart, windowEnd), [visibleJobs, windowStart, windowEnd]);

  // Day header groups: show week markers
  const weekMarkers = days.filter((_, i) => i % 7 === 0);

  return (
    <div className="p-4 md:p-6 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule Board</h1>
          <p className="text-sm text-muted-foreground">
            {format(windowStart, "MMM d")} – {format(windowEnd, "MMM d, yyyy")} · {visibleJobs.length} jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filters */}
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="Measure & Design Approval">Design</SelectItem>
              <SelectItem value="Fabrication">Fabrication</SelectItem>
              <SelectItem value="Powder Coat">Powder Coat</SelectItem>
              <SelectItem value="Ready for Install">Staging</SelectItem>
              <SelectItem value="Install Day">Install</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Fence">Fence</SelectItem>
              <SelectItem value="Gate">Gate</SelectItem>
              <SelectItem value="Railing">Railing</SelectItem>
              <SelectItem value="Staircase">Staircase</SelectItem>
              <SelectItem value="Custom Structure">Custom</SelectItem>
            </SelectContent>
          </Select>
          {allCrew.length > 0 && (
            <Select value={crewFilter} onValueChange={setCrewFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <Users className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Crew</SelectItem>
                {allCrew.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {/* Window navigation */}
          <div className="flex items-center border rounded-md overflow-hidden h-8">
            <button onClick={() => setDayOffset(o => o - 7)} className="px-2 h-full hover:bg-muted transition-colors border-r">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setDayOffset(0)} className="px-3 h-full text-xs font-medium hover:bg-muted transition-colors border-r">
              Today
            </button>
            <button onClick={() => setDayOffset(o => o + 7)} className="px-2 h-full hover:bg-muted transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto border rounded-xl bg-card">
        {/* Heatmap header */}
        <div className="sticky top-0 bg-card border-b z-20 pb-2 pt-3">
          <div className="flex items-center text-[10px] text-muted-foreground mb-1 ml-52 gap-px">
            {weekMarkers.map(d => (
              <div key={d.toISOString()} className="flex-1" style={{ minWidth: `${(7 / WINDOW_DAYS) * 100}%` }}>
                {format(d, "MMM d")}
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-muted-foreground w-52 shrink-0 pl-3 font-medium">Fab Load</span>
            <div className="flex flex-1 gap-px mr-20">
              {days.map(d => {
                const key = format(d, "yyyy-MM-dd");
                const val = heatmap.map[key] || 0;
                const ratio = val / heatmap.max;
                let bg = "bg-muted";
                if (ratio > 0.66) bg = "bg-red-400";
                else if (ratio > 0.33) bg = "bg-amber-300";
                else if (ratio > 0) bg = "bg-emerald-300";
                const isToday = isSameDay(d, TODAY);
                return (
                  <div
                    key={key}
                    title={`${format(d, "EEE MMM d")}: ${val} fab job(s)`}
                    className={`h-3 flex-1 rounded-sm ${bg} ${isToday ? "ring-1 ring-red-500" : ""} transition-colors`}
                  />
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 ml-52 text-[9px] text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-300" /> Light</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-amber-300" /> Moderate</div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Heavy</div>
            <div className="ml-4 flex items-center gap-1.5">
              {[
                { color: "emerald", label: "Install" },
                { color: "lime", label: "Staging" },
                { color: "blue", label: "Powder Coat" },
                { color: "orange", label: "Fabrication" },
                { color: "purple", label: "Design" },
              ].map(({ color, label }) => {
                const c = getPhaseColors(color);
                return (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${c.bg}`} />
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Job rows */}
        <div>
          {visibleJobs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No scheduled jobs in this window.</p>
              <p className="text-xs mt-1">Set a Promised Install Date on a job to see it here.</p>
            </div>
          ) : (
            visibleJobs.map(job => (
              <JobGanttRow
                key={job.id}
                job={job}
                days={days}
                windowStart={windowStart}
                windowEnd={windowEnd}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}