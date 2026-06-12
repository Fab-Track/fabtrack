import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO, format, differenceInDays, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import KpiCard from "./shared/KpiCard";
import EmptyState from "./shared/EmptyState";
import ReportHeader from "./shared/ReportHeader";
import ReportExportButtons from "./ReportExportButtons";
import PhaseDurationReport from "./PhaseDurationReport";

const STAGE_ORDER = ["In Fabrication", "At Powder Coat", "Ready for Install", "Install Scheduled", "Install Complete"];

function inRange(dateStr, range) {
  if (!range || !dateStr) return true;
  try { return isWithinInterval(parseISO(dateStr), range); } catch { return false; }
}

export default function ProductionReport() {
  const [range, setRange] = useState(null);

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 500) });
  const { data: timeEntries = [] } = useQuery({ queryKey: ["timeEntries", "all"], queryFn: () => base44.entities.TimeEntry.list("-clock_in", 1000) });
  const { data: qcInspections = [] } = useQuery({ queryKey: ["qcInspections"], queryFn: () => base44.entities.QCInspection.list("-created_date", 500) });

  // ── KPIs ────────────────────────────────────────────────────────────
  const completedJobs = jobs.filter(j => ["Install Complete", "Invoiced"].includes(j.status) && inRange(j.updated_date, range));
  const today = new Date();

  const shopDurations = completedJobs.map(j => {
    const h = j.stage_history || [];
    const entry = h.find(s => s.to_stage === "In Fabrication" || s.to_board === "Shop");
    const exit = h.find(s => s.to_stage === "Install Complete" || s.to_stage === "Invoiced");
    if (!entry || !exit) return null;
    return differenceInDays(parseISO(exit.timestamp), parseISO(entry.timestamp));
  }).filter(d => d !== null && d >= 0);
  const avgDaysInShop = shopDurations.length > 0 ? Math.round(shopDurations.reduce((s, d) => s + d, 0) / shopDurations.length) : null;

  const scheduledInstalls = jobs.filter(j => j.stage === "Install Scheduled" || j.status === "Install Scheduled");
  const onTimeInstalls = completedJobs.filter(j => j.expected_install_date && j.updated_date && !differenceInDays(parseISO(j.updated_date), parseISO(j.expected_install_date)) > 0).length;
  const onTimeRate = completedJobs.length > 0 ? Math.round((onTimeInstalls / completedJobs.length) * 100) : null;

  const qcFlags = qcInspections.filter(q => q.rework_required && inRange(q.created_date, range)).length;

  // ── Jobs in Progress (current snapshot) ─────────────────────────────
  const activeShopJobs = jobs.filter(j => j.pipeline_board === "Shop" && !["Install Complete", "Invoiced"].includes(j.status));

  // ── Throughput chart ────────────────────────────────────────────────
  const now = new Date();
  const weeklyThroughput = Array.from({ length: 12 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, 11 - i));
    const weekEnd = endOfWeek(subWeeks(now, 11 - i));
    const count = completedJobs.filter(j => {
      const d = j.updated_date ? parseISO(j.updated_date) : null;
      return d && d >= weekStart && d <= weekEnd;
    }).length;
    return { week: format(weekStart, "MMM d"), count };
  });
  const TARGET = 3; // configurable default

  // ── Work center utilization ──────────────────────────────────────────
  const workCenters = ["Cut", "Fit", "Weld", "Grind", "Install", "Design", "Powder Coat"];
  const wcData = workCenters.map(wc => {
    const entries = timeEntries.filter(t => t.work_center === wc && inRange(t.clock_in, range));
    const avgTime = entries.length > 0 ? entries.reduce((s, t) => s + (t.duration_hours || 0), 0) / entries.length : 0;
    const queueJobs = activeShopJobs.filter(j => {
      const emp = j.assigned_crew_names || [];
      return emp.length > 0; // rough proxy
    }).length;
    return { wc, jobs: entries.length, avgTime: avgTime.toFixed(1), queue: activeShopJobs.length };
  }).filter(d => d.jobs > 0);

  // ── Labor hours ──────────────────────────────────────────────────────
  const filteredEntries = timeEntries.filter(t => inRange(t.clock_in, range));
  const totalHours = filteredEntries.reduce((s, t) => s + (t.duration_hours || 0), 0);

  const empHours = {};
  filteredEntries.forEach(t => {
    const name = t.employee_name || "Unknown";
    if (!empHours[name]) empHours[name] = { name, hours: 0, jobs: new Set() };
    empHours[name].hours += t.duration_hours || 0;
    if (t.job_id) empHours[name].jobs.add(t.job_id);
  });
  const laborData = Object.values(empHours)
    .map(e => ({ ...e, jobs: e.jobs.size }))
    .sort((a, b) => b.hours - a.hours);

  const csvData = () => laborData.map(d => ({ Employee: d.name, "Hours Clocked": d.hours.toFixed(1), "Jobs Worked": d.jobs }));

  return (
    <div className="space-y-8">
      <ReportHeader onRangeChange={setRange} exportData={csvData} exportFilename="production-report" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Jobs Completed" value={completedJobs.length} />
        <KpiCard label="Avg Days in Shop" value={avgDaysInShop !== null ? `${avgDaysInShop}d` : "—"} />
        <KpiCard label="On-Time Installs" value={onTimeRate !== null ? `${onTimeRate}%` : "—"} />
        <KpiCard label="QC Flags" value={qcFlags} color={qcFlags > 0 ? "orange" : "default"} />
      </div>

      {/* Jobs in progress */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Jobs in Progress (Current)</h2>
        {activeShopJobs.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {STAGE_ORDER.map(stage => {
              const stageJobs = activeShopJobs.filter(j => j.stage === stage);
              return (
                <div key={stage} className="min-w-[200px] flex-shrink-0">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">{stage} ({stageJobs.length})</div>
                  <div className="space-y-2">
                    {stageJobs.length === 0 ? (
                      <div className="border-dashed border rounded-lg h-16 flex items-center justify-center text-xs text-muted-foreground">Empty</div>
                    ) : stageJobs.map(j => {
                      const daysInStage = j.stage_entered_at ? differenceInDays(today, parseISO(j.stage_entered_at)) : null;
                      const isLong = daysInStage !== null && daysInStage > 5;
                      const isPast = j.expected_install_date && differenceInDays(today, parseISO(j.expected_install_date)) > 0;
                      return (
                        <div key={j.id} className={`border rounded-lg p-3 text-xs ${isPast ? "bg-red-50 border-red-200" : isLong ? "bg-yellow-50 border-yellow-200" : "bg-card"}`}>
                          <p className="font-semibold truncate">{j.job_name}</p>
                          {daysInStage !== null && <p className="text-muted-foreground mt-0.5">{daysInStage}d in stage</p>}
                          {j.expected_install_date && <p className="text-muted-foreground">Est: {j.expected_install_date}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyState message="No active jobs in production right now." />}
      </section>

      {/* Throughput chart */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Weekly Throughput (Jobs Completed)</h2>
        {weeklyThroughput.some(w => w.count > 0) ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyThroughput}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceLine y={TARGET} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: `Target: ${TARGET}`, fontSize: 10, fill: "#f43f5e", position: "right" }} />
                <Bar dataKey="count" name="Jobs Completed" radius={[4, 4, 0, 0]}>
                  {weeklyThroughput.map((w, i) => <Cell key={i} fill={w.count < TARGET ? "#f43f5e" : "#1e3a5f"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState />}
      </section>

      {/* Phase Duration Analysis */}
      <PhaseDurationReport />

      {/* Work center utilization */}
      {wcData.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-sm">Work Center Utilization</h2>
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["Work Center", "Jobs Through (Period)", "Avg Hours/Job", "Current Queue"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {wcData.map(wc => (
                  <tr key={wc.wc} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{wc.wc}</td>
                    <td className="px-3 py-2">{wc.jobs}</td>
                    <td className="px-3 py-2">{wc.avgTime}h</td>
                    <td className="px-3 py-2">{activeShopJobs.length} jobs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Labor hours */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Labor Hours Summary</h2>
          <ReportExportButtons getData={csvData} filename="labor-hours" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <div className="border rounded-xl p-3 bg-card">
            <p className="text-xs text-muted-foreground">Total Hours Clocked</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
          </div>
          <div className="border rounded-xl p-3 bg-card">
            <p className="text-xs text-muted-foreground">Avg Hours / Completed Job</p>
            <p className="text-2xl font-bold">{completedJobs.length > 0 ? (totalHours / completedJobs.length).toFixed(1) : "—"}</p>
          </div>
        </div>
        {laborData.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["Employee", "Hours Clocked", "Jobs Worked"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {laborData.map(row => (
                  <tr key={row.name} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{row.hours.toFixed(1)}</td>
                    <td className="px-3 py-2">{row.jobs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No time entries yet. Have fabricators clock in from the Shop Kiosk." />}
      </section>
    </div>
  );
}