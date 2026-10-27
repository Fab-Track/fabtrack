import React from "react";
import { format, parseISO, isSameDay, startOfDay, isAfter, isBefore } from "date-fns";
import { Link } from "react-router-dom";
import { PHASE_COLORS, PHASE_SHORT } from "@/lib/scheduleUtils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MapPin, Users, ChevronRight } from "lucide-react";

const TODAY = startOfDay(new Date());

function buildAgenda(jobs, windowStart, windowEnd) {
  // Flatten all phases into dated events, group by date
  const eventMap = {};

  const addEvent = (date, job, phase) => {
    const key = format(date, "yyyy-MM-dd");
    if (!eventMap[key]) eventMap[key] = [];
    // Avoid duplicates
    const exists = eventMap[key].some(e => e.job.id === job.id && e.phaseName === phase.name);
    if (!exists) {
      eventMap[key].push({
        job,
        phaseName: phase.name,
        phaseStatus: phase.status,
        sortKey: `${key}-${job.job_name}`,
      });
    }
  };

  jobs.forEach(job => {
    const phases = job.schedule_phases || [];
    if (phases.length > 0) {
      phases.forEach(phase => {
        const s = parseISO(phase.startDate);
        const e = parseISO(phase.endDate);
        // Show phase start day in the list
        const showDate = s < windowStart ? windowStart : s > windowEnd ? null : s;
        if (showDate && showDate <= windowEnd) {
          addEvent(showDate, job, phase);
        }
      });
    } else {
      // No phases, just show install date
      const installStr = job.promised_install_date || job.expected_install_date;
      if (installStr) {
        const d = parseISO(installStr);
        if (d >= windowStart && d <= windowEnd) {
          addEvent(d, job, { name: "Install Day", status: "upcoming" });
        }
      }
    }
  });

  // Sort keys chronologically
  return Object.entries(eventMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, events]) => ({
      date: parseISO(dateKey),
      events: events.sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    }));
}

function AgendaEventRow({ event }) {
  const colors = PHASE_COLORS[event.phaseName];
  const isInstall = event.phaseName === "Install Day";
  const isDone = event.phaseStatus === "complete";

  return (
    <Link
      to={`/jobs/${event.job.id}?from=schedule`}
      className={cn(
        "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/20 last:border-b-0",
        isDone && "opacity-50"
      )}
    >
      {/* Phase color swatch */}
      <div className={cn("w-2 self-stretch rounded-full shrink-0", colors?.bg)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground truncate">{event.job.job_name}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{event.job.job_number}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", colors?.light)}>
            {PHASE_SHORT[event.phaseName] || event.phaseName}
          </Badge>
          {event.job.job_type && (
            <span className="text-[10px] text-muted-foreground">{event.job.job_type}</span>
          )}
          {event.job.assigned_crew_names?.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="w-3 h-3" />
              {event.job.assigned_crew_names.join(", ")}
            </span>
          )}
          {event.job.site_address && isInstall && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {event.job.site_address}
            </span>
          )}
        </div>
      </div>

      {isDone && (
        <Badge variant="secondary" className="text-[9px] shrink-0">Done</Badge>
      )}
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </Link>
  );
}

function DateGroup({ date, events }) {
  const isToday = isSameDay(date, TODAY);
  const isPast = isBefore(date, TODAY);

  return (
    <div className="border-b border-border/40 last:border-b-0">
      {/* Date header */}
      <div className={cn(
        "px-4 py-2 flex items-center gap-3 sticky top-0 z-10 border-b border-border/20",
        isToday ? "bg-red-50 dark:bg-red-950/20" : isPast ? "bg-muted/30" : "bg-muted/10"
      )}>
        <div className={cn("text-sm font-bold", isToday && "text-red-600")}>
          {isToday ? "Today" : format(date, "EEEE")}
        </div>
        <div className="text-xs text-muted-foreground">{format(date, "MMMM d, yyyy")}</div>
        <Badge variant="outline" className="text-[9px] ml-auto">{events.length} item{events.length !== 1 ? "s" : ""}</Badge>
      </div>
      {events.map((ev, i) => (
        <AgendaEventRow key={`${ev.job.id}-${ev.phaseName}-${i}`} event={ev} />
      ))}
    </div>
  );
}

export default function ListView({ jobs, days, windowStart, windowEnd }) {
  const agenda = buildAgenda(jobs, windowStart, windowEnd);

  if (agenda.length === 0) {
    return (
      <div className="flex-1 border rounded-xl bg-card flex items-center justify-center">
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No scheduled activity in this window.</p>
          <p className="text-xs mt-1">Try expanding the date range or checking your filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto border rounded-xl bg-card">
      {agenda.map(({ date, events }) => (
        <DateGroup key={format(date, "yyyy-MM-dd")} date={date} events={events} />
      ))}
    </div>
  );
}