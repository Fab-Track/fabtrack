import React, { useRef } from "react";
import { format, parseISO, differenceInCalendarDays, isSameDay, startOfDay, eachDayOfInterval } from "date-fns";
import { Link } from "react-router-dom";
import { PHASE_COLORS, PHASE_SHORT, buildFabHeatmap, getHeatColor } from "@/lib/scheduleUtils";
import { cn } from "@/lib/utils";

const TODAY = startOfDay(new Date());

function FabLoadRow({ heatmap, days, capacity, totalDays }) {
  return (
    <div className="flex items-center border-b border-border/50 h-8 bg-muted/30">
      <div className="w-52 shrink-0 px-3 flex items-center">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Fab Load</span>
      </div>
      <div className="flex-1 flex gap-px px-1 h-5 items-end relative">
        {/* Today line */}
        {TODAY >= days[0] && TODAY <= days[days.length - 1] && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${(differenceInCalendarDays(TODAY, days[0]) / totalDays) * 100}%` }}
          />
        )}
        {days.map(d => {
          const key = format(d, "yyyy-MM-dd");
          const entry = heatmap[key] || { count: 0, hours: 0 };
          const { bg, label } = getHeatColor(entry.hours, capacity);
          const isToday = isSameDay(d, TODAY);
          return (
            <div
              key={key}
              title={`${format(d, "EEE MMM d")}: ${label} · ${entry.count} job(s) in fab · ~${Math.round(entry.hours)}h`}
              className={cn("flex-1 rounded-sm transition-colors cursor-default", bg, isToday && "ring-1 ring-red-500")}
            />
          );
        })}
      </div>
      <div className="w-20 shrink-0" />
    </div>
  );
}

function PhaseBar({ phase, windowStart, totalDays }) {
  const s = parseISO(phase.startDate);
  const e = parseISO(phase.endDate);
  const leftPct = (differenceInCalendarDays(s, windowStart) / totalDays) * 100;
  const widthPct = Math.max(0.5, ((differenceInCalendarDays(e, s) + 1) / totalDays) * 100);
  const colors = PHASE_COLORS[phase.name] || PHASE_COLORS["Fabrication"];
  const faded = phase.status === "complete";

  return (
    <div
      title={`${PHASE_SHORT[phase.name] || phase.name}: ${format(s, "MMM d")} – ${format(e, "MMM d")}`}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      className={cn(
        "absolute h-full rounded-sm text-[9px] font-semibold flex items-center px-1 overflow-hidden whitespace-nowrap cursor-pointer transition-opacity",
        colors.bg, colors.text,
        faded ? "opacity-30" : "opacity-85 hover:opacity-100"
      )}
    >
      {widthPct > 5 && (PHASE_SHORT[phase.name] || phase.name)}
    </div>
  );
}

function JobRow({ job, days, windowStart, windowEnd, totalDays }) {
  const phases = (job.schedule_phases || []).filter(p => {
    const s = parseISO(p.startDate);
    const e = parseISO(p.endDate);
    return e >= windowStart && s <= windowEnd;
  });

  const todayInWindow = TODAY >= windowStart && TODAY <= windowEnd;
  const todayLeft = todayInWindow
    ? `${(differenceInCalendarDays(TODAY, windowStart) / totalDays) * 100}%`
    : null;

  const installDate = job.promised_install_date || job.expected_install_date;

  return (
    <Link
      to={`/jobs/${job.id}?from=schedule`}
      className="flex items-center h-10 hover:bg-muted/40 transition-colors border-b border-border/30 group"
    >
      <div className="w-52 shrink-0 px-3 flex flex-col justify-center">
        <div className="text-xs font-medium truncate group-hover:text-accent transition-colors">{job.job_name}</div>
        <div className="text-[10px] text-muted-foreground font-mono truncate">{job.job_number}</div>
      </div>

      <div className="flex-1 relative h-6 mx-1">
        {/* Today line */}
        {todayLeft && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none" style={{ left: todayLeft }} />
        )}
        {phases.map(phase => (
          <PhaseBar key={phase.name} phase={phase} windowStart={windowStart} totalDays={totalDays} />
        ))}
      </div>

      <div className="w-20 shrink-0 text-[10px] text-muted-foreground text-right pr-3">
        {installDate ? format(parseISO(installDate), "MMM d") : "—"}
      </div>
    </Link>
  );
}

function DayColumns({ days, windowStart, totalDays, zoom }) {
  // Show appropriate granularity based on zoom
  const showEveryDay = zoom === "Day" || zoom === "Week";
  const markers = showEveryDay ? days : days.filter((_, i) => i % 7 === 0);

  return (
    <div className="flex ml-52 mb-0 text-[10px] text-muted-foreground mr-20">
      {showEveryDay ? (
        days.map(d => (
          <div key={d.toISOString()} className={cn("flex-1 text-center py-1 border-r border-border/20 last:border-r-0", isSameDay(d, TODAY) && "text-red-500 font-bold")}>
            <div>{format(d, "EEE")}</div>
            <div>{format(d, "d")}</div>
          </div>
        ))
      ) : (
        markers.map(d => (
          <div key={d.toISOString()} className="flex-1">
            {format(d, "MMM d")}
          </div>
        ))
      )}
    </div>
  );
}

export default function TimelineView({ jobs, days, windowStart, windowEnd, zoom, capacity = 40 }) {
  const totalDays = Math.max(1, days.length);
  const heatmap = buildFabHeatmap(jobs, days);

  return (
    <div className="flex-1 overflow-auto border rounded-xl bg-card">
      {/* Sticky header */}
      <div className="sticky top-0 bg-card border-b z-20 pb-2 pt-2">
        {/* Day columns */}
        <div className="flex items-center text-[10px] text-muted-foreground mb-1">
          <div className="w-52 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Job</div>
          <DayColumns days={days} windowStart={windowStart} totalDays={totalDays} zoom={zoom} />
        </div>

        {/* Fab heatmap */}
        <FabLoadRow heatmap={heatmap} days={days} capacity={capacity} totalDays={totalDays} />

        {/* Legend */}
        <div className="flex items-center gap-3 ml-3 mt-1.5 text-[9px] text-muted-foreground flex-wrap">
          <span className="font-semibold uppercase tracking-wide">Fab Load:</span>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-300" /> Light</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-300" /> Moderate</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-400" /> Heavy</div>
          <span className="ml-3 font-semibold uppercase tracking-wide">Phases:</span>
          {Object.entries(PHASE_SHORT).map(([phaseName, label]) => {
            const c = PHASE_COLORS[phaseName];
            return (
              <div key={label} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-sm", c.bg)} />
                {label}
              </div>
            );
          })}
          <div className="flex items-center gap-1 ml-2">
            <div className="w-0.5 h-3 bg-red-500" />
            Today
          </div>
        </div>
      </div>

      {/* Job rows */}
      <div>
        {jobs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No scheduled jobs in this window.</p>
            <p className="text-xs mt-1">Set a Promised Install Date on a job to see it here.</p>
          </div>
        ) : (
          jobs.map(job => (
            <JobRow
              key={job.id}
              job={job}
              days={days}
              windowStart={windowStart}
              windowEnd={windowEnd}
              totalDays={totalDays}
            />
          ))
        )}
      </div>
    </div>
  );
}