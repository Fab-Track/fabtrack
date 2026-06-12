import React, { useRef } from "react";
import { format, parseISO, differenceInCalendarDays, isSameDay, startOfDay, startOfMonth, isSameMonth } from "date-fns";
import { Link } from "react-router-dom";
import { PHASE_COLORS, PHASE_SHORT, getPhaseColorByName } from "@/lib/scheduleUtils";
import { cn } from "@/lib/utils";

const TODAY = startOfDay(new Date());
const LABEL_COL_W = 208; // px — fixed left label column
const INSTALL_COL_W = 72; // px — fixed right install date column

// ─── Shared coordinate system ─────────────────────────────────────────────────
// All horizontal positioning uses these two helpers.
// `totalDays` = days.length (the number of day-slots in the window)
// leftPct(dayOffset)  → "X%" from the left edge of the timeline content area
// widthPct(numDays)   → "Y%" of the timeline content area
function leftPct(dayOffset, totalDays) {
  return `${(dayOffset / totalDays) * 100}%`;
}
function widthPct(numDays, totalDays) {
  return `${Math.max(0.4, (numDays / totalDays) * 100)}%`;
}
function dayOffset(date, windowStart) {
  return Math.max(0, differenceInCalendarDays(date, windowStart));
}

// ─── Header columns ───────────────────────────────────────────────────────────
function DayColumnsHeader({ days, windowStart, totalDays, zoom }) {
  // Decide which markers to show based on zoom
  if (zoom === "Day") {
    // Hours 6am–10pm
    const hours = Array.from({ length: 17 }, (_, i) => i + 6);
    return (
      <div className="relative h-9" style={{ marginLeft: LABEL_COL_W, marginRight: INSTALL_COL_W }}>
        {hours.map((h, i) => {
          const leftP = (i / hours.length) * 100;
          return (
            <div
              key={h}
              className={cn("absolute top-0 bottom-0 flex flex-col items-center justify-center text-[9px] border-r border-border/20", i === 0 && "border-l border-border/20")}
              style={{ left: `${leftP}%`, width: `${100 / hours.length}%` }}
            >
              <span className="text-muted-foreground">{h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (zoom === "Week") {
    // 7 day columns
    return (
      <div className="relative h-9" style={{ marginLeft: LABEL_COL_W, marginRight: INSTALL_COL_W }}>
        {days.map((d, i) => {
          const isToday = isSameDay(d, TODAY);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "absolute top-0 bottom-0 flex flex-col items-center justify-center text-[10px] border-r border-border/20",
                i === 0 && "border-l border-border/20",
                isToday ? "text-red-500 font-bold bg-red-50/50 dark:bg-red-950/20" : "text-muted-foreground"
              )}
              style={{ left: leftPct(i, totalDays), width: widthPct(1, totalDays) }}
            >
              <span>{format(d, "EEE")}</span>
              <span>{format(d, "d")}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (zoom === "Month") {
    // One column per day, show labels at week starts
    return (
      <div className="relative h-9" style={{ marginLeft: LABEL_COL_W, marginRight: INSTALL_COL_W }}>
        {/* Week-start labels */}
        {days.map((d, i) => {
          const isMonday = d.getDay() === 1;
          const isFirst = i === 0;
          const showLabel = isMonday || isFirst;
          const isToday = isSameDay(d, TODAY);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "absolute top-0 bottom-0 border-r border-border/10",
                i === 0 && "border-l border-border/20",
                isToday && "bg-red-50/50 dark:bg-red-950/20"
              )}
              style={{ left: leftPct(i, totalDays), width: widthPct(1, totalDays) }}
            >
              {showLabel && (
                <span className={cn(
                  "absolute bottom-1 left-0.5 text-[9px] whitespace-nowrap font-medium",
                  isToday ? "text-red-500" : "text-muted-foreground"
                )}>
                  {format(d, "MMM d")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (zoom === "Quarter") {
    // One slot per day, label at month starts
    let prevMonth = null;
    return (
      <div className="relative h-9" style={{ marginLeft: LABEL_COL_W, marginRight: INSTALL_COL_W }}>
        {days.map((d, i) => {
          const month = d.getMonth();
          const isNewMonth = month !== prevMonth;
          if (isNewMonth) prevMonth = month;
          const isToday = isSameDay(d, TODAY);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "absolute top-0 bottom-0 border-r border-border/5",
                isNewMonth && "border-l-2 border-l-border/40",
                isToday && "bg-red-50/50 dark:bg-red-950/20"
              )}
              style={{ left: leftPct(i, totalDays), width: widthPct(1, totalDays) }}
            >
              {isNewMonth && (
                <span className="absolute bottom-1 left-1 text-[9px] whitespace-nowrap font-semibold text-muted-foreground">
                  {format(d, "MMM")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

// ─── Vertical grid lines (rendered behind content) ────────────────────────────
function GridLines({ days, windowStart, totalDays, zoom }) {
  // Only render grid lines for longer zoom levels to avoid noise
  if (zoom === "Day" || zoom === "Week") return null; // the header cells already show borders

  const markers = zoom === "Month"
    ? days.filter(d => d.getDay() === 1 || differenceInCalendarDays(d, days[0]) === 0)
    : days.filter(d => d.getDate() === 1 || differenceInCalendarDays(d, days[0]) === 0);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {markers.map(d => {
        const offset = dayOffset(d, days[0]);
        return (
          <div
            key={d.toISOString()}
            className="absolute top-0 bottom-0 border-l border-border/15"
            style={{ left: leftPct(offset, totalDays) }}
          />
        );
      })}
    </div>
  );
}

// ─── Today vertical line ──────────────────────────────────────────────────────
function TodayLine({ days, totalDays }) {
  if (TODAY < days[0] || TODAY > days[days.length - 1]) return null;
  const offset = dayOffset(TODAY, days[0]);
  // Add half a day offset to center the line within the "today" column
  const pct = ((offset + 0.5) / totalDays) * 100;
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
      style={{ left: `${pct}%` }}
    />
  );
}

// ─── Individual phase bar ─────────────────────────────────────────────────────
function PhaseBar({ phase, windowStart, windowEnd, totalDays }) {
  const s = parseISO(phase.startDate);
  const e = parseISO(phase.endDate);

  // Clamp to window
  const clampedStart = s < windowStart ? windowStart : s;
  const clampedEnd = e > windowEnd ? windowEnd : e;

  const offset = dayOffset(clampedStart, windowStart);
  const duration = differenceInCalendarDays(clampedEnd, clampedStart) + 1;
  const leftP = (offset / totalDays) * 100;
  const widthP = Math.max(0.5, (duration / totalDays) * 100);

  const colors = PHASE_COLORS[phase.name] || getPhaseColorByName(phase.color) || getPhaseColorByName(phase.name);
  const faded = phase.status === "complete";
  const isTrimmedLeft = s < windowStart;
  const isTrimmedRight = e > windowEnd;
  const shortLabel = PHASE_SHORT[phase.name] || phase.name;

  return (
    <div
      title={`${shortLabel}: ${format(s, "MMM d")} – ${format(e, "MMM d")}`}
      style={{ left: `${leftP}%`, width: `${widthP}%` }}
      className={cn(
        "absolute h-full flex items-center px-1 overflow-hidden whitespace-nowrap cursor-pointer transition-opacity text-[9px] font-semibold",
        colors.bg, colors.text,
        faded ? "opacity-25" : "opacity-85 hover:opacity-100",
        isTrimmedLeft ? "rounded-r-sm" : "rounded-l-sm",
        isTrimmedRight ? "rounded-l-sm" : "rounded-r-sm",
        !isTrimmedLeft && !isTrimmedRight && "rounded-sm"
      )}
    >
      {widthP > 5 && shortLabel}
      {isTrimmedRight && <span className="ml-auto">›</span>}
    </div>
  );
}

// ─── Job row ──────────────────────────────────────────────────────────────────
function JobRow({ job, days, windowStart, windowEnd, totalDays }) {
  const phases = (job.schedule_phases || []).filter(p => {
    const s = parseISO(p.startDate);
    const e = parseISO(p.endDate);
    return e >= windowStart && s <= windowEnd;
  });

  const installDate = job.promised_install_date || job.expected_install_date;

  return (
    <Link
      to={`/jobs/${job.id}?from=schedule`}
      className="flex items-center h-10 hover:bg-muted/40 transition-colors border-b border-border/20 group relative"
    >
      {/* Fixed label */}
      <div
        className="shrink-0 px-3 flex flex-col justify-center z-10 bg-card group-hover:bg-muted/40 transition-colors"
        style={{ width: LABEL_COL_W }}
      >
        <div className="text-xs font-medium truncate group-hover:text-accent transition-colors">{job.job_name}</div>
        <div className="text-[10px] text-muted-foreground font-mono truncate">{job.job_number}</div>
      </div>

      {/* Timeline content area */}
      <div
        className="absolute top-0 bottom-0 overflow-hidden"
        style={{ left: LABEL_COL_W, right: INSTALL_COL_W }}
      >
        {/* Today line */}
        <TodayLine days={days} totalDays={totalDays} />

        {/* Phase bars */}
        <div className="absolute inset-0 flex items-center px-0 py-1">
          {phases.map(phase => (
            <PhaseBar
              key={phase.name}
              phase={phase}
              windowStart={windowStart}
              windowEnd={windowEnd}
              totalDays={totalDays}
            />
          ))}
        </div>
      </div>

      {/* Fixed install date */}
      <div
        className="shrink-0 text-[10px] text-muted-foreground text-right pr-3 z-10"
        style={{ width: INSTALL_COL_W }}
      >
        {installDate ? format(parseISO(installDate), "MMM d") : "—"}
      </div>
    </Link>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function TimelineView({ jobs, days, windowStart, windowEnd, zoom }) {
  const totalDays = Math.max(1, days.length);

  return (
    <div className="flex-1 overflow-auto border rounded-xl bg-card">
      {/* Sticky header */}
      <div className="sticky top-0 bg-card border-b z-30">
        {/* Column header row */}
        <div className="flex items-center">
          <div
            className="shrink-0 px-3 flex items-center h-9 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-r border-border/30"
            style={{ width: LABEL_COL_W }}
          >
            Job
          </div>
          <div className="flex-1 relative overflow-hidden">
            <DayColumnsHeader
              days={days}
              windowStart={windowStart}
              totalDays={totalDays}
              zoom={zoom}
            />
          </div>
          <div
            className="shrink-0 px-3 flex items-center h-9 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-l border-border/30"
            style={{ width: INSTALL_COL_W }}
          >
            Install
          </div>
        </div>

        {/* Phase legend */}
        <div className="flex items-center gap-3 px-3 py-1.5 text-[9px] text-muted-foreground flex-wrap border-t border-border/20">
          <span className="font-semibold uppercase tracking-wide">Phases:</span>
          {Object.entries(PHASE_SHORT).map(([phaseName, label]) => {
            const c = PHASE_COLORS[phaseName];
            if (!c) return null;
            return (
              <span key={label} className="flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-sm inline-block", c.bg)} />
                {label}
              </span>
            );
          })}
          <span className="flex items-center gap-1 ml-2">
            <span className="w-px h-3 bg-red-500 inline-block" />
            Today
          </span>
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