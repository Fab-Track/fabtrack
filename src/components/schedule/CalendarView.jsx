import React, { useState } from "react";
import { format, parseISO, isSameDay, startOfDay, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { Link } from "react-router-dom";
import { PHASE_COLORS, PHASE_SHORT } from "@/lib/scheduleUtils";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const TODAY = startOfDay(new Date());
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getEventsByDay(jobs, days) {
  const map = {};
  days.forEach(d => { map[format(d, "yyyy-MM-dd")] = []; });

  jobs.forEach(job => {
    (job.schedule_phases || []).forEach(phase => {
      const s = parseISO(phase.startDate);
      const e = parseISO(phase.endDate);
      days.forEach(d => {
        if (d >= s && d <= e) {
          const key = format(d, "yyyy-MM-dd");
          if (map[key]) {
            map[key].push({ job, phase });
          }
        }
      });
    });

    // If no schedule phases, show on install date
    if (!job.schedule_phases?.length) {
      const installStr = job.promised_install_date || job.expected_install_date;
      if (installStr) {
        const key = format(parseISO(installStr), "yyyy-MM-dd");
        if (map[key]) {
          map[key].push({ job, phase: { name: "Install Day", status: "upcoming" } });
        }
      }
    }
  });

  return map;
}

// Build a full calendar grid (weeks from month start to end)
function buildCalendarGrid(windowStart, windowEnd) {
  const gridStart = startOfWeek(windowStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(windowEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  return weeks;
}

function DayCell({ day, events, isCurrentMonth, onClick, selected }) {
  const isToday = isSameDay(day, TODAY);
  const maxShow = 3;
  const shown = events.slice(0, maxShow);
  const overflow = events.length - maxShow;

  return (
    <div
      onClick={() => onClick(day, events)}
      className={cn(
        "min-h-[80px] border-r border-b border-border/30 p-1 cursor-pointer hover:bg-muted/30 transition-colors",
        !isCurrentMonth && "bg-muted/20 opacity-60",
        selected && "bg-primary/5"
      )}
    >
      <div className={cn(
        "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
        isToday ? "bg-red-500 text-white" : "text-foreground"
      )}>
        {format(day, "d")}
      </div>
      <div className="space-y-0.5">
        {shown.map((ev, i) => {
          const colors = PHASE_COLORS[ev.phase.name];
          const isInstall = ev.phase.name === "Install Day";
          return (
            <div
              key={`${ev.job.id}-${ev.phase.name}-${i}`}
              className={cn(
                "text-[9px] px-1 py-0.5 rounded truncate font-medium",
                colors?.bg, colors?.text,
                isInstall && "ring-1 ring-white/50 font-bold"
              )}
              title={`${ev.job.job_name} — ${PHASE_SHORT[ev.phase.name] || ev.phase.name}`}
            >
              {ev.job.job_name}
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="text-[9px] text-muted-foreground pl-1">+{overflow} more</div>
        )}
      </div>
    </div>
  );
}

function DayPanel({ day, events, onClose }) {
  return (
    <div className="w-72 shrink-0 border-l bg-card overflow-y-auto">
      <div className="sticky top-0 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">{format(day, "EEEE")}</div>
          <div className="text-xs text-muted-foreground">{format(day, "MMMM d, yyyy")}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled</p>
        ) : (
          events.map((ev, i) => {
            const colors = PHASE_COLORS[ev.phase.name];
            return (
              <Link
                key={`${ev.job.id}-${i}`}
                to={`/jobs/${ev.job.id}?from=schedule`}
                className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-2 h-2 rounded-full", colors?.bg)} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {PHASE_SHORT[ev.phase.name] || ev.phase.name}
                  </span>
                </div>
                <div className="text-xs font-semibold">{ev.job.job_name}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{ev.job.job_number}</div>
                {ev.job.assigned_crew_names?.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Crew: {ev.job.assigned_crew_names.join(", ")}
                  </div>
                )}
                {ev.job.site_address && (
                  <div className="text-[10px] text-muted-foreground truncate">{ev.job.site_address}</div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function CalendarView({ jobs, days, windowStart, windowEnd }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);

  const allDays = eachDayOfInterval({ start: windowStart, end: windowEnd });
  const eventsByDay = getEventsByDay(jobs, allDays);
  const weeks = buildCalendarGrid(windowStart, windowEnd);

  const handleDayClick = (day, events) => {
    if (selectedDay && isSameDay(day, selectedDay)) {
      setSelectedDay(null);
      setSelectedEvents([]);
    } else {
      setSelectedDay(day);
      setSelectedEvents(events);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden border rounded-xl bg-card">
      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b sticky top-0 bg-card z-10">
          {WEEK_DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-2 border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map(day => {
              const key = format(day, "yyyy-MM-dd");
              const events = eventsByDay[key] || [];
              const isCurrentMonth = isSameMonth(day, windowStart);
              return (
                <DayCell
                  key={key}
                  day={day}
                  events={events}
                  isCurrentMonth={isCurrentMonth}
                  onClick={handleDayClick}
                  selected={selectedDay && isSameDay(day, selectedDay)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <DayPanel
          day={selectedDay}
          events={selectedEvents}
          onClose={() => { setSelectedDay(null); setSelectedEvents([]); }}
        />
      )}
    </div>
  );
}