import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { parseISO, differenceInCalendarDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PHASE_COLORS, PHASE_ORDER } from "@/lib/scheduleUtils";
import EmptyState from "./shared/EmptyState";

export default function PhaseDurationReport() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs", "phase-duration"],
    queryFn: () => base44.entities.Job.list("-created_date", 500),
  });

  // Only jobs that have schedule_phases set
  const scheduledJobs = jobs.filter(j => j.schedule_phases?.length > 0);

  // Calculate per-phase durations across all scheduled jobs
  const phaseStats = {};
  PHASE_ORDER.forEach(name => {
    phaseStats[name] = { name, durations: [], total: 0, count: 0 };
  });

  scheduledJobs.forEach(job => {
    (job.schedule_phases || []).forEach(p => {
      const stat = phaseStats[p.name];
      if (!stat || !p.startDate || !p.endDate) return;
      const start = parseISO(p.startDate);
      const end = parseISO(p.endDate);
      const days = differenceInCalendarDays(end, start) + 1;
      if (isNaN(days) || days < 1) return;
      stat.durations.push(days);
      stat.total += days;
      stat.count++;
    });
  });

  const chartData = PHASE_ORDER.map(name => {
    const s = phaseStats[name];
    const avg = s.count > 0 ? (s.total / s.count) : 0;
    const min = s.durations.length > 0 ? Math.min(...s.durations) : 0;
    const max = s.durations.length > 0 ? Math.max(...s.durations) : 0;
    return { name, avg: Math.round(avg * 10) / 10, min, max, count: s.count };
  }).filter(d => d.count > 0);

  const overallAvg = chartData.length > 0
    ? Math.round((chartData.reduce((s, d) => s + d.avg, 0) / chartData.length) * 10) / 10
    : 0;

  // Calculate total project duration (first phase start to last phase end)
  const projectDurations = scheduledJobs.map(job => {
    const phases = job.schedule_phases || [];
    if (phases.length < 2) return null;
    const sorted = [...phases].sort((a, b) =>
      differenceInCalendarDays(parseISO(a.startDate), parseISO(b.startDate))
    );
    const first = parseISO(sorted[0].startDate);
    const last = parseISO(sorted[sorted.length - 1].endDate);
    return differenceInCalendarDays(last, first) + 1;
  }).filter(d => d !== null && d > 0);

  const avgProjectDays = projectDurations.length > 0
    ? Math.round(projectDurations.reduce((s, d) => s + d, 0) / projectDurations.length)
    : null;

  if (isLoading) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-sm">Phase Duration Analysis</h2>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="border rounded-xl p-3 bg-card">
          <p className="text-xs text-muted-foreground">Avg Project Duration</p>
          <p className="text-2xl font-bold">{avgProjectDays !== null ? `${avgProjectDays}d` : "—"}</p>
        </div>
        <div className="border rounded-xl p-3 bg-card">
          <p className="text-xs text-muted-foreground">Scheduled Jobs</p>
          <p className="text-2xl font-bold">{scheduledJobs.length}</p>
        </div>
        <div className="border rounded-xl p-3 bg-card">
          <p className="text-xs text-muted-foreground">Avg Days Per Phase</p>
          <p className="text-2xl font-bold">{overallAvg > 0 ? `${overallAvg}d` : "—"}</p>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 90, right: 30, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="d" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} width={85} />
              <Tooltip
                formatter={(value) => [`${value} days`, "Average"]}
                labelFormatter={(label) => `${label} Phase`}
              />
              <Bar dataKey="avg" name="Avg Days" radius={[0, 4, 4, 0]} barSize={28}>
                {chartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={(PHASE_COLORS[d.name] || {}).hex || "#6b7280"}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="No scheduled jobs with phase data yet. Generate a schedule from a job to populate this report." />
      )}

      {/* Detail table */}
      {chartData.length > 0 && (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Phase</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Jobs</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Avg Days</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Min</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Max</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {chartData.map(row => {
                const colors = PHASE_COLORS[row.name] || {};
                return (
                  <tr key={row.name} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-sm inline-block ${colors.bg || "bg-muted"}`} />
                        <span className="font-medium">{row.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">{row.count}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{row.avg}d</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{row.min}d</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{row.max}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}