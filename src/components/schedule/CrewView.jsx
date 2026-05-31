import React from "react";
import { format, parseISO, differenceInCalendarDays, isSameDay, startOfDay, eachDayOfInterval } from "date-fns";
import { Link } from "react-router-dom";
import { PHASE_COLORS, PHASE_SHORT, buildFabHeatmap, getHeatColor } from "@/lib/scheduleUtils";
import { cn } from "@/lib/utils";

const TODAY = startOfDay(new Date());

function buildCrewMap(jobs) {
  // Returns { crewName: [{ job, phase }] }
  const map = { __unassigned: [] };

  jobs.forEach(job => {
    const crew = job.assigned_crew_names || [];
    const phases = job.schedule_phases || [];

    if (crew.length === 0) {
      phases.forEach(phase => map.__unassigned.push({ job, phase }));
      if (phases.length === 0 && (job.promised_install_date || job.expected_install_date)) {
        map.__unassigned.push({ job, phase: { name: "Install Day", startDate: job.promised_install_date || job.expected_install_date, endDate: job.promised_install_date || job.expected_install_date, status: "upcoming" } });
      }
    } else {
      crew.forEach(name => {
        if (!map[name]) map[name] = [];
        phases.forEach(phase => map[name].push({ job, phase }));
        if (phases.length === 0 && (job.promised_install_date || job.expected_install_date)) {
          map[name].push({ job, phase: { name: "Install Day", startDate: job.promised_install_date || job.expected_install_date, endDate: job.promised_install_date || job.expected_install_date, status: "upcoming" } });
        }
      });
    }
  });

  return map;
}

function CrewRow({ name, entries, days, windowStart, windowEnd, isUnassigned }) {
  const totalDays = Math.max(1, days.length);
  const todayInWindow = TODAY >= days[0] && TODAY <= days[days.length - 1];

  return (
    <div className={cn("flex items-center border-b border-border/30 min-h-[44px] group", isUnassigned && "bg-amber-50 dark:bg-amber-950/20")}>
      <div className="w-44 shrink-0 px-3 py-2">
        <div className={cn("text-xs font-semibold truncate", isUnassigned && "text-amber-700 dark:text-amber-400")}>
          {isUnassigned ? "⚠ Unassigned" : name}
        </div>
        <div className="text-[10px] text-muted-foreground">{entries.length} phase(s)</div>
      </div>

      <div className="flex-1 relative h-8 mx-1 my-1">
        {/* Today line */}
        {todayInWindow && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${(differenceInCalendarDays(TODAY, days[0]) / totalDays) * 100}%` }}
          />
        )}

        {entries.map((entry, i) => {
          const s = parseISO(entry.phase.startDate);
          const e = parseISO(entry.phase.endDate);
          if (e < windowStart || s > windowEnd) return null;

          const clampedStart = s < windowStart ? windowStart : s;
          const clampedEnd = e > windowEnd ? windowEnd : e;
          const leftPct = (differenceInCalendarDays(clampedStart, windowStart) / totalDays) * 100;
          const widthPct = Math.max(0.5, ((differenceInCalendarDays(clampedEnd, clampedStart) + 1) / totalDays) * 100);
          const colors = PHASE_COLORS[entry.phase.name] || PHASE_COLORS["Fabrication"];
          const faded = entry.phase.status === "complete";

          return (
            <Link
              key={`${entry.job.id}-${entry.phase.name}-${i}`}
              to={`/jobs/${entry.job.id}?from=schedule`}
              title={`${entry.job.job_name} — ${PHASE_SHORT[entry.phase.name] || entry.phase.name}`}
              style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "2px" }}
              className={cn(
                "absolute h-full rounded-sm text-[9px] font-semibold flex items-center px-1 overflow-hidden whitespace-nowrap cursor-pointer transition-opacity",
                colors.bg, colors.text,
                faded ? "opacity-30" : "opacity-85 hover:opacity-100"
              )}
            >
              {widthPct > 8 && entry.job.job_name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function CrewView({ jobs, days, windowStart, windowEnd }) {
  const crewMap = buildCrewMap(jobs);
  const totalDays = Math.max(1, days.length);

  const crewNames = Object.keys(crewMap).filter(n => n !== "__unassigned").sort();
  const hasUnassigned = crewMap.__unassigned?.length > 0;

  // Day header markers
  const showEveryDay = days.length <= 7;
  const markers = showEveryDay ? days : days.filter((_, i) => i % 7 === 0);

  return (
    <div className="flex-1 overflow-auto border rounded-xl bg-card">
      {/* Sticky header */}
      <div className="sticky top-0 bg-card border-b z-20 pt-2 pb-1">
        <div className="flex items-center text-[10px] text-muted-foreground">
          <div className="w-44 shrink-0 px-3 font-semibold uppercase tracking-wide">Crew Member</div>
          <div className={cn("flex flex-1", showEveryDay ? "" : "")}>
            {showEveryDay ? (
              days.map(d => (
                <div key={d.toISOString()} className={cn("flex-1 text-center border-r border-border/20 py-1 last:border-r-0", isSameDay(d, TODAY) && "text-red-500 font-bold")}>
                  <div>{format(d, "EEE")}</div>
                  <div>{format(d, "d")}</div>
                </div>
              ))
            ) : (
              markers.map(d => (
                <div key={d.toISOString()} className="flex-1 py-1">
                  {format(d, "MMM d")}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Unassigned row first (attention-getter) */}
      {hasUnassigned && (
        <CrewRow
          name="__unassigned"
          entries={crewMap.__unassigned}
          days={days}
          windowStart={windowStart}
          windowEnd={windowEnd}
          isUnassigned
        />
      )}

      {/* Crew rows */}
      {crewNames.length === 0 && !hasUnassigned ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No crew assigned in this window.</p>
        </div>
      ) : (
        crewNames.map(name => (
          <CrewRow
            key={name}
            name={name}
            entries={crewMap[name]}
            days={days}
            windowStart={windowStart}
            windowEnd={windowEnd}
            isUnassigned={false}
          />
        ))
      )}
    </div>
  );
}