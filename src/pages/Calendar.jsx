import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, getDay } from "date-fns";

const GCAL_CONNECTOR_ID = "6a3064759fc0db7e563bb0c8";

const TYPE_COLORS = {
  Measure: "bg-blue-500",
  Consultation: "bg-purple-500",
  "Site Visit": "bg-amber-500",
  Other: "bg-slate-500",
};

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

export default function Calendar() {
  const { user } = useAuth();
  const [view, setView] = useState("month"); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarScope, setCalendarScope] = useState("all"); // "all" | "mine" | userId
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalConnSource, setGcalConnSource] = useState(null); // "shared" | "app_user" | null
  const [gcalLoading, setGcalLoading] = useState(true);
  const [gcalError, setGcalError] = useState(null);

  // Check Google Calendar connection status
  const checkGcal = useCallback(async () => {
    setGcalError(null);
    try {
      const res = await base44.functions.invoke("syncEventToGoogle", { event_id: "_check", action: "check" });
      setGcalConnected(!res.data?.skipped);
      setGcalConnSource(res.data?.source || null);
    } catch {
      setGcalConnected(false);
      setGcalConnSource(null);
    } finally {
      setGcalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) checkGcal();
  }, [user, checkGcal]);

  const handleConnectGcal = async () => {
    setGcalError(null);
    try {
      const res = await base44.functions.invoke("calendarOAuthStart", {});
      const authUrl = res.data?.auth_url;
      if (!authUrl) {
        setGcalError("Failed to start OAuth. Please try again.");
        return;
      }
      const popup = window.open(authUrl, "_blank");
      if (!popup) {
        setGcalError("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          checkGcal();
        }
      }, 500);
    } catch (e) {
      console.error("Google Calendar connect error:", e);
      setGcalError("Failed to start connection. Please refresh and try again.");
    }
  };

  const handleDisconnectGcal = async () => {
    try {
      // Also try APP_USER connector disconnect
      try { await base44.connectors.disconnectAppUser(GCAL_CONNECTOR_ID); } catch {}
      setGcalConnected(false);
      setGcalConnSource(null);
      setGcalError(null);
    } catch (e) {
      console.error("Google Calendar disconnect error:", e);
      setGcalError("Failed to disconnect. Please try again.");
    }
  };

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["all-scheduled-events"],
    queryFn: () => base44.entities.ScheduledEvent.list("-date", 500),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  // Build unique assigned-users map for filter dropdown + color coding
  const { assignedUsers, assigneeColors } = useMemo(() => {
    const map = {};
    const palette = [
      "bg-emerald-500", "bg-violet-500", "bg-rose-500", "bg-sky-500",
      "bg-amber-500", "bg-indigo-500", "bg-teal-500", "bg-pink-500",
    ];
    const softPalette = [
      "bg-emerald-100 text-emerald-800", "bg-violet-100 text-violet-800",
      "bg-rose-100 text-rose-800", "bg-sky-100 text-sky-800",
      "bg-amber-100 text-amber-800", "bg-indigo-100 text-indigo-800",
      "bg-teal-100 text-teal-800", "bg-pink-100 text-pink-800",
    ];
    const colorMap = {};
    let idx = 0;
    events.forEach(e => {
      if (e.assigned_user_ids?.length) {
        e.assigned_user_ids.forEach((uid, i) => {
          if (!map[uid]) {
            map[uid] = { id: uid, name: e.assigned_user_names?.[i] || uid };
            colorMap[uid] = { dot: palette[idx % palette.length], badge: softPalette[idx % softPalette.length] };
            idx++;
          }
        });
      }
    });
    return { assignedUsers: map, assigneeColors: colorMap };
  }, [events]);

  // Filter: All / Mine / by team member
  const filteredEvents = useMemo(() => {
    if (!user) return [];
    return events.filter(e => {
      if (e.status !== "Scheduled") return false;
      if (calendarScope === "mine") {
        if (e.assigned_user_ids?.length) {
          return e.assigned_user_ids.includes(user.id);
        }
        return true;
      }
      if (calendarScope !== "all") {
        return e.assigned_user_ids?.includes(calendarScope);
      }
      return true;
    });
  }, [events, calendarScope, user]);

  // Navigation
  function prev() {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  }
  function next() {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  }
  function goToday() {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }

  const titleText = view === "month"
    ? format(currentDate, "MMMM yyyy")
    : view === "week"
    ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")}`
    : format(currentDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Calendar</h1>
          <Badge variant="outline" className="text-xs">{filteredEvents.length} events</Badge>
          {!gcalLoading && (
            gcalConnected ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600" onClick={handleDisconnectGcal}>
                <CalendarIcon className="w-3.5 h-3.5" />
                Google Connected{gcalConnSource === "app_user" ? " (You)" : gcalConnSource === "shared" ? " (Team)" : ""}
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleConnectGcal}>
                  <CalendarIcon className="w-3.5 h-3.5" /> Connect My Google
                </Button>
                {gcalError && <span className="text-[11px] text-destructive">{gcalError}</span>}
              </div>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Calendar scope dropdown — defaults to "All" */}
          <Select value={calendarScope} onValueChange={setCalendarScope}>
            <SelectTrigger className="h-8 text-xs gap-1.5 min-w-[160px]">
              <Users className="w-3 h-3 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-medium">All Appointments</SelectItem>
              <SelectItem value="mine" className="text-xs">My Appointments</SelectItem>
              {Object.keys(assignedUsers).length > 0 && <SelectSeparator />}
              {Object.entries(assignedUsers).map(([uid, u]) => (
                <SelectItem key={uid} value={uid} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${assigneeColors[uid]?.dot || "bg-slate-400"}`} />
                    {u.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* View toggle */}
          <div className="flex items-center border rounded-md overflow-hidden h-8">
            {["month", "week", "day"].map(v => (
              <button
                key={v}
                className={`px-3 h-full text-xs font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                onClick={() => { setView(v); if (v === "day") setCurrentDate(selectedDate); }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nav bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="text-base font-semibold min-w-[160px] text-center">{titleText}</h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>Today</Button>
      </div>

      {/* Calendar Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <>
          {view === "month" && <MonthView currentDate={currentDate} events={filteredEvents} assigneeColors={assigneeColors} />}
          {view === "week" && <WeekView currentDate={currentDate} events={filteredEvents} assigneeColors={assigneeColors} />}
          {view === "day" && <DayView currentDate={currentDate} events={filteredEvents} assigneeColors={assigneeColors} />}
        </>
      )}
    </div>
  );
}

// ── Month View ──────────────────────────────────────────────────────────────
function MonthView({ currentDate, events, assigneeColors }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {dayNames.map(d => (
          <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0">{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map(d => {
          const dayEvents = events.filter(e => e.date && isSameDay(parseISO(e.date), d));
          const isCurrentMonth = isSameMonth(d, currentDate);
          const isToday = isSameDay(d, new Date());
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[80px] md:min-h-[100px] p-1 border-r border-b last:border-r-0 text-xs ${isCurrentMonth ? "bg-transparent" : "bg-muted/30"}`}
            >
              <div className={`font-medium mb-0.5 px-1 ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                {format(d, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <EventDot key={ev.id} event={ev} assigneeColors={assigneeColors} />
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────────────────────────
function WeekView({ currentDate, events, assigneeColors }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6am-7pm

  return (
    <div className="bg-card rounded-xl border overflow-auto">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 text-xs text-muted-foreground font-medium text-center border-r">Time</div>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i);
            const isToday = isSameDay(d, new Date());
            return (
              <div key={i} className={`p-2 text-center border-r last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}>
                <p className="text-[10px] text-muted-foreground uppercase">{format(d, "EEE")}</p>
                <p className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>{format(d, "d")}</p>
              </div>
            );
          })}
        </div>
        {/* Hour rows */}
        {hours.map(h => (
          <div key={h} className="grid grid-cols-8 border-b text-xs">
            <div className="p-1.5 text-muted-foreground font-medium text-center border-r">{h % 12 || 12}{h >= 12 ? "PM" : "AM"}</div>
            {Array.from({ length: 7 }, (_, dayIdx) => {
              const d = addDays(weekStart, dayIdx);
              const hourEvents = events.filter(e => {
                if (!e.date || !isSameDay(parseISO(e.date), d)) return false;
                const startH = parseInt(e.start_time?.split(":")[0]);
                return startH === h;
              });
              return (
                <div key={dayIdx} className="p-0.5 border-r last:border-r-0 min-h-[36px]">
                  {hourEvents.map(ev => (
                    <EventDot key={ev.id} event={ev} assigneeColors={assigneeColors} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day View ─────────────────────────────────────────────────────────────────
function DayView({ currentDate, events, assigneeColors }) {
  const dayEvents = events.filter(e => e.date && isSameDay(parseISO(e.date), currentDate)).sort((a, b) => {
    return (a.start_time || "").localeCompare(b.start_time || "");
  });
  const hours = Array.from({ length: 14 }, (_, i) => i + 6);
  const isToday = isSameDay(currentDate, new Date());

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className={`p-3 border-b flex items-center justify-between ${isToday ? "bg-primary/5" : ""}`}>
        <div>
          <p className="text-sm font-semibold">{format(currentDate, "EEEE, MMMM d")}</p>
          <p className="text-xs text-muted-foreground">{dayEvents.length} appointment{dayEvents.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map(h => {
          const hourEvents = dayEvents.filter(e => {
            const startH = parseInt(e.start_time?.split(":")[0]);
            return startH === h;
          });
          return (
            <div key={h} className="flex border-b text-xs min-h-[48px]">
              <div className="w-16 shrink-0 p-2 text-muted-foreground font-medium text-center border-r bg-muted/20">
                {h % 12 || 12}{h >= 12 ? "P" : "A"}
              </div>
              <div className="flex-1 p-1.5 space-y-1">
                {hourEvents.map(ev => (
                  <DayEventCard key={ev.id} event={ev} assigneeColors={assigneeColors} />
                ))}
              </div>
            </div>
          );
        })}
        {dayEvents.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No appointments for this day.</div>
        )}
      </div>
    </div>
  );
}

// ── Mini Event Dot (month/week) ─────────────────────────────────────────────
function EventDot({ event, assigneeColors }) {
  const typeColor = TYPE_COLORS[event.event_type] || TYPE_COLORS.Other;
  const firstUid = event.assigned_user_ids?.[0];
  const assigneeColor = firstUid ? (assigneeColors[firstUid]?.dot || "bg-slate-400") : typeColor;
  return (
    <Link to={`/jobs/${event.job_id}`} className="block truncate">
      <div className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-muted/80 transition-colors">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${assigneeColor}`} />
        <span className="truncate text-[10px] leading-tight">
          {formatTime(event.start_time)} {event.event_type}
          {event.assigned_user_names?.length > 0 && (
            <span className="text-[9px] text-muted-foreground ml-0.5">
              · {event.assigned_user_names[0].split(" ")[0]}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}

// ── Event Card (day view) ────────────────────────────────────────────────────
function DayEventCard({ event, assigneeColors }) {
  const typeColor = TYPE_COLORS[event.event_type] || TYPE_COLORS.Other;
  const firstUid = event.assigned_user_ids?.[0];
  const stripeColor = firstUid ? (assigneeColors[firstUid]?.dot || "bg-slate-400") : typeColor;
  return (
    <Link to={`/jobs/${event.job_id}`} className="block">
      <div className="flex items-start gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
        <div className={`w-1 self-stretch rounded-full ${stripeColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] py-0 h-5 ${TYPE_COLORS[event.event_type] ? TYPE_COLORS[event.event_type].replace("500", "100").replace("500", "800") : ""}`}>
              {event.event_type}
            </Badge>
            <span className="text-xs font-medium">{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
          </div>
          <p className="text-xs font-medium mt-0.5">{event.job_name}</p>
          {event.customer_name && <p className="text-[11px] text-muted-foreground">{event.customer_name}</p>}
          {event.assigned_user_names?.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {event.assigned_user_ids.map((uid, i) => (
                <Badge key={uid} className={`text-[10px] py-0 h-5 ${assigneeColors[uid]?.badge || "bg-slate-100 text-slate-700"}`}>
                  {event.assigned_user_names[i]?.split(" ")[0] || uid}
                </Badge>
              ))}
            </div>
          )}
          {event.location && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{event.location}</p>
          )}
          {event.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{event.notes}</p>}
        </div>
      </div>
    </Link>
  );
}