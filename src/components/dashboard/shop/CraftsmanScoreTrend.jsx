import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Bar, BarChart, ComposedChart, Legend } from "recharts";
import { subWeeks, startOfWeek, endOfWeek, parseISO, isWithinInterval, format } from "date-fns";

export default function CraftsmanScoreTrend({ qcInspections }) {
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 11 - i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const inspections = (qcInspections || []).filter(q => {
      if (!q.created_date) return false;
      return isWithinInterval(parseISO(q.created_date), { start: weekStart, end: weekEnd });
    });
    const avg = inspections.length > 0
      ? Math.round(inspections.reduce((s, q) => s + (q.quality_score || 0), 0) / inspections.length)
      : null;
    return {
      week: format(weekStart, "MMM d"),
      score: avg,
      inspections: inspections.length,
    };
  });

  if ((qcInspections || []).length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Craftsman Score Trend — 12 Weeks</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No QC inspection data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Craftsman Score Trend — 12 Weeks</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={weeks} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="score" domain={[0, 100]} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
            />
            <Bar yAxisId="count" dataKey="inspections" fill="hsl(var(--muted))" opacity={0.5} name="# Inspections" radius={[2,2,0,0]} />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--accent))"
              strokeWidth={2.5}
              dot={{ fill: "hsl(var(--accent))", r: 3 }}
              connectNulls
              name="Avg Score"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}