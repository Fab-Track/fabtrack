import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO, format, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import ReportDateFilter from "./ReportDateFilter";
import ReportExportButtons from "./ReportExportButtons";

export default function ProductionReports() {
  const [range, setRange] = useState(null);

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 500) });
  const { data: timeEntries = [] } = useQuery({ queryKey: ["timeEntries","all"], queryFn: () => base44.entities.TimeEntry.list("-clock_in", 1000) });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all"], queryFn: () => base44.entities.Estimate.list("-created_date", 500) });
  const { data: qcInspections = [] } = useQuery({ queryKey: ["qcInspections"], queryFn: () => base44.entities.QCInspection.list("-created_date", 500) });

  // ── Report 1: Linear Footage per Labor Hour ──────────────────────
  const railingJobs = jobs.filter(j => {
    const est = estimates.find(e => e.job_id === j.id && e.status === "Approved");
    return est?.service_category === "Railing" || j.job_type === "Railing";
  });

  const lnftData = railingJobs.map(j => {
    const est = estimates.find(e => e.job_id === j.id && e.status === "Approved");
    const lnft = est?.railing_lnft || 0;
    const fabHours = timeEntries.filter(t => t.job_id === j.id && ["Cut","Fit","Weld","Grind"].includes(t.work_center))
      .reduce((s,t) => s+(t.duration_hours||0), 0);
    const rate = fabHours > 0 ? lnft / fabHours : 0;
    return { job: j.job_name, lnft, fabHours, rate: parseFloat(rate.toFixed(2)) };
  }).filter(j => j.lnft > 0 || j.fabHours > 0);

  // ── Report 2: Job Cycle Time ─────────────────────────────────────
  const completedJobs = jobs.filter(j => j.status === "Install Complete" || j.status === "Invoiced");
  const cycleData = completedJobs.map(j => {
    const history = j.stage_history || [];
    function daysInStage(stageName) {
      const entry = history.find(h => (h.to_stage || "").includes(stageName));
      const exit  = history.find(h => (h.from_stage || "").includes(stageName));
      if (!entry || !exit) return 0;
      return Math.max(0, differenceInDays(parseISO(exit.timestamp), parseISO(entry.timestamp)));
    }
    return {
      job: j.job_name,
      design: daysInStage("Design") || daysInStage("Drawing"),
      fabrication: daysInStage("Fabrication") || daysInStage("Fab"),
      powderCoat: daysInStage("Powder Coat"),
      install: daysInStage("Install"),
    };
  });

  // ── Report 3: Fabrication Throughput ─────────────────────────────
  const monthThroughput = {};
  completedJobs.forEach(j => {
    const d = j.updated_date ? parseISO(j.updated_date) : null;
    if (!d) return;
    const key = format(d, "MMM yyyy");
    if (!monthThroughput[key]) monthThroughput[key] = { month: key, count: 0 };
    monthThroughput[key].count++;
  });
  const throughputData = Object.values(monthThroughput).sort((a,b) => new Date(a.month)-new Date(b.month)).slice(-12);

  // ── Report 4: Rework Rate ─────────────────────────────────────────
  const reworkByEmployee = {};
  qcInspections.forEach(q => {
    const name = q.employee_name || "Unknown";
    if (!reworkByEmployee[name]) reworkByEmployee[name] = { total: 0, rework: 0 };
    reworkByEmployee[name].total++;
    if (q.rework_required) reworkByEmployee[name].rework++;
  });
  const reworkData = Object.entries(reworkByEmployee).map(([name, d]) => ({
    name,
    total: d.total,
    rework: d.rework,
    reworkRate: d.total > 0 ? parseFloat(((d.rework / d.total) * 100).toFixed(1)) : 0,
  })).sort((a,b) => a.reworkRate - b.reworkRate);

  // ── Report 5: Stalled Jobs ───────────────────────────────────────
  const stalledJobs = jobs
    .filter(j => j.stage_entered_at && j.pipeline_board === "Shop")
    .map(j => ({
      ...j,
      daysStalled: differenceInDays(new Date(), parseISO(j.stage_entered_at)),
    }))
    .filter(j => j.daysStalled >= 5)
    .sort((a,b) => b.daysStalled - a.daysStalled);

  return (
    <div className="space-y-8">
      <ReportDateFilter onChange={setRange} />

      {/* Report 1 — Linear Footage per Labor Hour */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Linear Footage per Labor Hour</h2>
          <ReportExportButtons getData={() => lnftData.map(d => ({ Job: d.job, "Lnft": d.lnft, "Fab Hours": d.fabHours, "Lnft/Hr": d.rate }))} filename="lnft-per-hour" />
        </div>
        {lnftData.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lnftData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="job" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="rate" fill="#3b82f6" name="Lnft/Hr" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>{["Job","Linear Feet","Fab Hours","Lnft / Hr"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {lnftData.map((d,i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-3 py-2">{d.job}</td>
                  <td className="px-3 py-2">{d.lnft}</td>
                  <td className="px-3 py-2">{d.fabHours.toFixed(1)}</td>
                  <td className="px-3 py-2 font-semibold">{d.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lnftData.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No railing jobs with linear footage data.</p>}
        </div>
      </section>

      {/* Report 2 — Job Cycle Time */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Job Cycle Time</h2>
          <ReportExportButtons getData={() => cycleData} filename="job-cycle-time" />
        </div>
        {cycleData.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="job" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="design" stackId="a" fill="#60a5fa" name="Design (days)" />
                <Bar dataKey="fabrication" stackId="a" fill="#818cf8" name="Fab (days)" />
                <Bar dataKey="powderCoat" stackId="a" fill="#fb923c" name="Powder Coat (days)" />
                <Bar dataKey="install" stackId="a" fill="#34d399" name="Install (days)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8">No completed jobs with stage history.</p>}
      </section>

      {/* Report 3 — Fabrication Throughput */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Fabrication Throughput</h2>
          <ReportExportButtons getData={() => throughputData} filename="throughput" />
        </div>
        {throughputData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" name="Jobs Completed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8">No completed jobs data.</p>}
      </section>

      {/* Report 4 — Rework Rate */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Rework Rate by Employee</h2>
          <ReportExportButtons getData={() => reworkData} filename="rework-rate" />
        </div>
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>{["Employee","Inspections","Rework","Rework Rate"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {reworkData.map((d,i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{d.name}</td>
                  <td className="px-3 py-2">{d.total}</td>
                  <td className="px-3 py-2">{d.rework}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${d.reworkRate <= 10 ? "bg-emerald-50 text-emerald-700" : d.reworkRate <= 25 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                      {d.reworkRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reworkData.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No QC inspection data.</p>}
        </div>
      </section>

      {/* Report 5 — Stalled Jobs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Stalled Jobs (5+ days in same stage)</h2>
          <ReportExportButtons getData={() => stalledJobs.map(j => ({ Job: j.job_name, Stage: j.stage, "Days Stalled": j.daysStalled, Crew: (j.assigned_crew_names||[]).join(", "), "Last Activity": j.last_activity_date }))} filename="stalled-jobs" />
        </div>
        {stalledJobs.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>{["Job","Stage","Days Stalled","Crew"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {stalledJobs.map(j => (
                  <tr key={j.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{j.job_name}</td>
                    <td className="px-3 py-2">{j.stage}</td>
                    <td className="px-3 py-2 font-semibold text-red-600">{j.daysStalled}d</td>
                    <td className="px-3 py-2 text-muted-foreground">{(j.assigned_crew_names||[]).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8 border rounded-lg">No stalled jobs in Shop Flow.</p>}
      </section>
    </div>
  );
}