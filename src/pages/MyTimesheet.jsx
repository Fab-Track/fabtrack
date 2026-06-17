/**
 * MyTimesheet — employee's personal hours view.
 * Shows live status, pay period summary, daily breakdown with punch detail,
 * missing punch warnings, correction requests, weekly trend, and YTD.
 * Hours only — no dollar amounts or wages.
 */
import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  format, parseISO, startOfDay, addDays, isSameDay,
  differenceInDays, differenceInSeconds, startOfWeek
} from "date-fns";
import {
  getCurrentPayPeriod, getPreviousPayPeriod,
  getNetHours, formatHours, formatHMS,
  getLiveElapsedSeconds
} from "@/lib/timeTrackingHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Clock, Download, Calendar, ChevronDown, ChevronRight,
  AlertTriangle, Clock5, MessageSquare, CheckCircle2, XCircle,
  FileEdit
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import LiveStatusBanner from "@/components/timetracking/LiveStatusBanner";
import PayPeriodSummaryCard from "@/components/timetracking/PayPeriodSummaryCard";
import CorrectionRequestModal from "@/components/timetracking/CorrectionRequestModal";
import WeeklyHoursChart from "@/components/timetracking/WeeklyHoursChart";
import { useOrgFilter } from "@/lib/orgContext";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function generateDayRows(payPeriod, allEntries, employeeId) {
  const days = [];
  let d = new Date(payPeriod.start);
  const end = new Date(payPeriod.end);
  while (d <= end) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }

  return days.map(date => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayEntries = allEntries.filter(e => {
      if (e.employee_id !== employeeId) return false;
      if (!e.clock_in) return false;
      return isSameDay(parseISO(e.clock_in), date);
    });

    // Collect ALL entries including shift, break, lunch
    const shiftEntries = dayEntries.filter(e => e.entry_type === "shift" || !e.entry_type);
    const breakEntries = dayEntries.filter(e => e.entry_type === "break" || e.entry_type === "lunch");

    const totalBreakMins = shiftEntries.reduce((s, e) => s + (e.break_minutes || 0), 0);
    const netHours = shiftEntries.reduce((s, e) => s + getNetHours(e), 0);

    const firstClockIn = shiftEntries.length > 0
      ? shiftEntries.reduce((min, e) => e.clock_in && (!min || e.clock_in < min) ? e.clock_in : min, null)
      : null;
    const lastClockOut = shiftEntries.length > 0
      ? shiftEntries.reduce((max, e) => e.clock_out && (!max || e.clock_out > max) ? e.clock_out : max, null)
      : null;

    // Check for missing clock-out (incomplete punch)
    const hasMissingPunch = shiftEntries.some(e => !e.is_active && e.clock_in && !e.clock_out);
    const hasActiveEntry = shiftEntries.some(e => e.is_active);

    // Build punch timeline
    const allPunches = [];
    shiftEntries.forEach(e => {
      if (e.clock_in) allPunches.push({ time: parseISO(e.clock_in), type: "in", label: "Clock In", entry: e });
      if (e.clock_out) allPunches.push({ time: parseISO(e.clock_out), type: "out", label: "Clock Out", entry: e });
    });
    breakEntries.forEach(e => {
      if (e.clock_in) allPunches.push({ time: parseISO(e.clock_in), type: "break_start", label: e.entry_type === "lunch" ? "Lunch Start" : "Break Start", entry: e });
      if (e.clock_out) allPunches.push({ time: parseISO(e.clock_out), type: "break_end", label: e.entry_type === "lunch" ? "Lunch End" : "Break End", entry: e });
    });
    allPunches.sort((a, b) => a.time - b.time);

    return {
      date, dateKey, shiftEntries, breakEntries, allPunches,
      firstClockIn, lastClockOut, totalBreakMins, netHours,
      hasMissingPunch, hasActiveEntry, hasEntries: shiftEntries.length > 0,
    };
  });
}

// ─── Main Component ────────────────────────────────────────────────────────────
const PP_OPTIONS = [
  { value: "current", label: () => `Current: ${getCurrentPayPeriod().label}` },
  { value: "previous", label: () => `Previous: ${getPreviousPayPeriod().label}` },
];

export default function MyTimesheet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ppView, setPpView] = useState("current");
  const [expandedDays, setExpandedDays] = useState({});
  const [correctionDay, setCorrectionDay] = useState(null);

  const orgFilter = useOrgFilter();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", orgFilter],
    queryFn: () => base44.entities.Employee.filter(orgFilter, "-created_date", 100),
  });

  const myEmployee = employees.find(
    e => e.email === user?.email || e.personal_email === user?.email || e.created_by_id === user?.id
  ) || null;

  const myId = myEmployee?.id || user?.id;

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["timeEntries", "all", orgFilter],
    queryFn: () => base44.entities.TimeEntry.filter(orgFilter, "-clock_in", 2000),
    enabled: !!myId,
    refetchInterval: 30000,
  });

  const { data: activeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active", orgFilter],
    queryFn: () => base44.entities.TimeEntry.filter({ ...orgFilter, is_active: true }),
    refetchInterval: 15000,
  });

  const { data: correctionRequests = [] } = useQuery({
    queryKey: ["correctionRequests", myId, orgFilter],
    queryFn: () => base44.entities.CorrectionRequest.filter({ ...orgFilter, employee_id: myId }, "-created_date", 100),
    enabled: !!myId,
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.TimeEntry.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    });
    return unsub;
  }, [queryClient]);

  // Master clock entry
  const myActiveEntries = myId ? activeEntries.filter(e => e.employee_id === myId) : [];
  const masterEntry = myActiveEntries.find(e => !e.job_id) || null;

  // Pay period
  const pp = ppView === "current" ? getCurrentPayPeriod() : getPreviousPayPeriod();

  const myEntries = allEntries.filter(e => e.employee_id === myId);
  const periodEntries = myEntries.filter(e => {
    if (e.is_active) return false;
    if (!e.clock_in) return false;
    const d = parseISO(e.clock_in);
    return d >= pp.start && d <= pp.end;
  });

  const dayRows = useMemo(
    () => generateDayRows(pp, allEntries, myId),
    [pp, allEntries, myId]
  );

  // Correction request map by date
  const correctionMap = {};
  correctionRequests.forEach(r => {
    if (r.date) correctionMap[r.date] = r;
  });

  // ── Export CSV ──
  const exportCSV = () => {
    const rows = [["Date", "Clock In", "Clock Out", "Break (min)", "Net Hours", "Work Center", "Notes"]];
    periodEntries.forEach(e => {
      rows.push([
        e.clock_in ? format(parseISO(e.clock_in), "yyyy-MM-dd") : "",
        e.clock_in ? format(parseISO(e.clock_in), "h:mm a") : "",
        e.clock_out ? format(parseISO(e.clock_out), "h:mm a") : "—",
        e.break_minutes || 0,
        getNetHours(e).toFixed(2),
        e.work_center || "",
        e.notes || "",
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet_${myEmployee?.name?.replace(/\s+/g, "_")}_${pp.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleDay = (key) => setExpandedDays(p => ({ ...p, [key]: !p[key] }));

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-24">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Timesheet</h1>
          <p className="text-sm text-muted-foreground">{myEmployee?.name || user?.full_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Live Status Banner ── */}
      <LiveStatusBanner masterEntry={masterEntry} />

      {/* ── Pay Period Selector ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Select value={ppView} onValueChange={setPpView}>
          <SelectTrigger className="w-64 sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PP_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">{periodEntries.length} entries</Badge>
      </div>

      {/* ── Pay Period Summary ── */}
      <PayPeriodSummaryCard
        periodEntries={periodEntries}
        payPeriod={pp}
        allEntries={myEntries}
        employeeId={myId}
      />

      {/* ── Daily Breakdown ── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Daily Breakdown
        </h3>

        {dayRows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-xl">
            <Clock5 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No time entries for this pay period</p>
          </div>
        ) : (
          <div className="space-y-1">
            {dayRows.map(day => {
              const isExpanded = expandedDays[day.dateKey] || false;
              const correction = correctionMap[day.dateKey];
              const isToday = isSameDay(day.date, new Date());

              return (
                <div key={day.dateKey} className={`border rounded-lg overflow-hidden ${isToday ? "ring-2 ring-primary/20" : ""} ${day.hasMissingPunch ? "border-red-300 bg-red-50/30" : ""}`}>
                  {/* Day row header */}
                  <button
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors text-left gap-2"
                    onClick={() => toggleDay(day.dateKey)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {format(day.date, "EEEE, MMM d")}
                            {isToday && <span className="text-primary font-medium text-xs ml-1">(Today)</span>}
                          </p>
                          {day.hasMissingPunch && (
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          )}
                        </div>
                        {day.hasEntries ? (
                          <p className="text-xs text-muted-foreground">
                            {day.firstClockIn ? format(parseISO(day.firstClockIn), "h:mm a") : "—"}
                            {day.lastClockOut ? ` → ${format(parseISO(day.lastClockOut), "h:mm a")}` : " → no clock-out"}
                            {day.totalBreakMins > 0 ? ` · ${Math.round(day.totalBreakMins)}m break` : ""}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No time logged</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {day.hasMissingPunch && (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Missing Punch</Badge>
                      )}
                      {correction && (
                        <Badge className={
                          correction.status === "approved" ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]" :
                          correction.status === "rejected" ? "bg-red-100 text-red-700 border-red-200 text-[10px]" :
                          "bg-amber-100 text-amber-700 border-amber-200 text-[10px]"
                        }>
                          {correction.status === "approved" ? "Corrected" : correction.status === "rejected" ? "Declined" : "Pending"}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold tabular-nums w-12 text-right">
                        {formatHours(day.netHours)}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t bg-muted/10 divide-y">
                      {/* Missing punch warning */}
                      {day.hasMissingPunch && (
                        <div className="p-3 bg-red-50 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="text-xs text-red-700">
                            <p className="font-semibold">Missing clock-out</p>
                            <p>Contact your manager or request a correction below.</p>
                          </div>
                        </div>
                      )}

                      {/* Punch timeline */}
                      {day.allPunches.length > 0 && (
                        <div className="p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Punch Detail</p>
                          <div className="space-y-1.5">
                            {day.allPunches.map((punch, i) => (
                              <div key={i} className="flex items-center gap-3 text-xs">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                  punch.type === "in" ? "bg-emerald-500" :
                                  punch.type === "out" ? "bg-red-500" :
                                  "bg-amber-500"
                                }`} />
                                <span className="font-mono font-medium">{format(punch.time, "h:mm a")}</span>
                                <span className="text-muted-foreground">{punch.label}</span>
                                {punch.entry?.work_center && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">{punch.entry.work_center}</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Correction request */}
                      {day.hasEntries && !day.hasActiveEntry && (
                        <div className="p-3 flex items-center justify-between">
                          {correction ? (
                            <div className="flex items-center gap-2 text-xs">
                              {correction.status === "approved" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : correction.status === "rejected" ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-500" />
                              )}
                              <span className="text-muted-foreground">
                                {correction.status === "approved" ? "Correction approved" :
                                 correction.status === "rejected" ? `Rejected: ${correction.admin_response || "No reason given"}` :
                                 "Correction pending review"}
                              </span>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => setCorrectionDay(day)}
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              Request Correction
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Shift entries detail */}
                      {day.shiftEntries.map(e => (
                        <div key={e.id} className="px-3 py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="font-mono">
                              {e.clock_in ? format(parseISO(e.clock_in), "h:mm a") : "—"}
                              {" → "}
                              {e.clock_out ? format(parseISO(e.clock_out), "h:mm a") : e.is_active ? "ongoing" : <span className="text-red-500">missing</span>}
                            </span>
                            {e.work_center && (
                              <Badge variant="outline" className="text-[10px] px-1">{e.work_center}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(e.break_minutes || 0) > 0 && (
                              <span className="text-muted-foreground">{Math.round(e.break_minutes)}m break</span>
                            )}
                            <span className="font-semibold tabular-nums">{formatHours(getNetHours(e))}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Weekly Hours Trend + YTD ── */}
      <div className="border rounded-xl p-5 bg-card">
        <WeeklyHoursChart allEntries={allEntries} employeeId={myId} weeksToShow={10} />
      </div>

      {/* ── Correction Request Modal ── */}
      {correctionDay && (
        <CorrectionRequestModal
          open={!!correctionDay}
          onClose={() => setCorrectionDay(null)}
          employee={myEmployee || { id: myId, name: user?.full_name }}
          dayEntries={correctionDay.shiftEntries}
          dateStr={correctionDay.dateKey}
        />
      )}
    </div>
  );
}