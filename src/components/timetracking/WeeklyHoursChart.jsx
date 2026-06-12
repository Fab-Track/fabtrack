import React, { useMemo } from "react";
import { getNetHours, formatHours } from "@/lib/timeTrackingHelpers";
import { parseISO, startOfWeek, endOfWeek, format, subWeeks } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Clock } from "lucide-react";

export default function WeeklyHoursChart({ allEntries, employeeId, weeksToShow = 12 }) {
  const now = new Date();

  const weeklyData = useMemo(() => {
    const data = [];
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const label = format(weekStart, "M/d");

      const weekEntries = allEntries.filter(e => {
        if (e.employee_id !== employeeId) return false;
        if (e.is_active) return false;
        if (!e.clock_in) return false;
        const d = parseISO(e.clock_in);
        return d >= weekStart && d <= weekEnd;
      });

      const hours = weekEntries.reduce((s, e) => s + getNetHours(e), 0);
      data.push({ label, hours: Math.round(hours * 10) / 10, weekStart, isCurrent: i === 0 });
    }
    return data;
  }, [allEntries, employeeId, weeksToShow]);

  const ytdHours = useMemo(() => {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return allEntries
      .filter(e => {
        if (e.employee_id !== employeeId) return false;
        if (e.is_active) return false;
        if (!e.clock_in) return false;
        return parseISO(e.clock_in) >= yearStart;
      })
      .reduce((s, e) => s + getNetHours(e), 0);
  }, [allEntries, employeeId]);

  if (weeklyData.every(d => d.hours === 0)) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
        No hours logged yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Weekly Hours Trend</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          YTD: <span className="font-semibold text-foreground">{formatHours(ytdHours)}</span>
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.floor(weeklyData.length / 6)} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, "auto"]} />
            <Tooltip formatter={(v) => [formatHours(v), "Hours"]} labelFormatter={(l) => `Week of ${l}`} />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {weeklyData.map((d, i) => (
                <Cell key={i} fill={d.hours >= 40 ? "#f59e0b" : "#3b82f6"} opacity={d.hours > 0 ? 0.85 : 0.2} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}