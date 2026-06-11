/**
 * MyTimesheet — employee's personal hours view.
 * Shows clock history, daily/weekly/pay-period totals. Hours only — no wages.
 * Read-only for employees.
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import {
  getCurrentPayPeriod, getPreviousPayPeriod,
  groupByDay, groupByWorkweek, formatHours, getNetHours
} from "@/lib/timeTrackingHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Clock, Download, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ClockWidget from "@/components/timetracking/ClockWidget";
import HoursStatsRow from "@/components/timetracking/HoursStatsRow";

const PP_OPTIONS = [
  { value: "current", label: () => `Current: ${getCurrentPayPeriod().label}` },
  { value: "previous", label: () => `Previous: ${getPreviousPayPeriod().label}` },
];

export default function MyTimesheet() {
  const { user } = useAuth();
  const [ppView, setPpView] = useState("current");
  const [expandedWeeks, setExpandedWeeks] = useState({});

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  const myEmployee = employees.find(e => e.email === user?.email) || null;

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["timeEntries", "all"],
    queryFn: () => base44.entities.TimeEntry.list("-clock_in", 1000),
    enabled: !!myEmployee,
    refetchInterval: 30000,
  });

  const { data: activeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active"],
    queryFn: () => base44.entities.TimeEntry.filter({ is_active: true }),
    refetchInterval: 15000,
  });

  const activeEntry = activeEntries.find(e => e.employee_id === myEmployee?.id) || null;

  const pp = ppView === "current" ? getCurrentPayPeriod() : getPreviousPayPeriod();

  const periodEntries = allEntries.filter(e => {
    if (e.employee_id !== myEmployee?.id) return false;
    if (e.is_active) return false;
    if (e.entry_type && e.entry_type !== "shift") return false;
    if (!e.clock_in) return false;
    const d = parseISO(e.clock_in);
    return d >= pp.start && d <= pp.end;
  });

  const weeks = groupByWorkweek(periodEntries, myEmployee?.id || "", pp.start, pp.end);

  const exportCSV = () => {
    const rows = [["Date","Clock In","Clock Out","Break (min)","Net Hours","Work Center","Notes"]];
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
    a.download = `timesheet_${myEmployee?.name?.replace(/\s+/g,"_")}_${pp.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );

  const toggleWeek = (key) => setExpandedWeeks(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Timesheet</h1>
          <p className="text-sm text-muted-foreground">{myEmployee?.name || user?.full_name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Clock widget */}
      {myEmployee && (
        <ClockWidget employee={myEmployee} activeEntry={activeEntry} />
      )}

      {/* Hours summary */}
      {myEmployee && (
        <HoursStatsRow
          employee={myEmployee}
          timeEntries={allEntries}
          activeEntry={activeEntry}
        />
      )}

      {/* Pay period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Select value={ppView} onValueChange={setPpView}>
          <SelectTrigger className="w-72">
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

      {/* Pay period total */}
      <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between border">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pay Period Total</p>
          <p className="text-2xl font-bold">{formatHours(periodEntries.reduce((s, e) => s + getNetHours(e), 0))}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{pp.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{periodEntries.length} shifts</p>
        </div>
      </div>

      {/* Weekly breakdown */}
      {weeks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No time entries for this pay period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map(week => {
            const key = format(week.weekStart, "yyyy-MM-dd");
            const isExpanded = expandedWeeks[key] !== false; // default expanded
            const days = groupByDay(week.entries, myEmployee?.id || "");

            return (
              <div key={key} className="border rounded-xl overflow-hidden">
                {/* Week header */}
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => toggleWeek(key)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-semibold">
                        Week of {format(week.weekStart, "MMM d")} – {format(week.weekEnd, "MMM d")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold">{formatHours(week.totalHours)}</p>
                      {week.overtimeHours > 0 && (
                        <p className="text-xs text-amber-600">incl. {formatHours(week.overtimeHours)} OT</p>
                      )}
                    </div>
                    {week.overtimeHours > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">OT</Badge>
                    )}
                  </div>
                </button>

                {/* Day entries */}
                {isExpanded && (
                  <div className="border-t divide-y">
                    {days.map(day => (
                      <div key={day.dateKey}>
                        {/* Day header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/20">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {format(day.date, "EEEE, MMM d")}
                          </p>
                          <p className="text-xs font-semibold">{formatHours(day.totalHours)}</p>
                        </div>
                        {/* Individual entries */}
                        {day.entries.map(e => (
                          <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/10">
                            <div className="flex items-center gap-3">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="font-mono text-xs">
                                {e.clock_in ? format(parseISO(e.clock_in), "h:mm a") : "—"}
                                {" → "}
                                {e.clock_out ? format(parseISO(e.clock_out), "h:mm a") : "ongoing"}
                              </span>
                              {e.work_center && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">{e.work_center}</Badge>
                              )}
                              {(e.break_minutes || 0) > 0 && (
                                <span className="text-xs text-muted-foreground">{Math.round(e.break_minutes)}m break</span>
                              )}
                            </div>
                            <span className="font-semibold text-xs">{formatHours(getNetHours(e))}</span>
                          </div>
                        ))}
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
  );
}