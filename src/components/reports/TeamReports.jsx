import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import ReportDateFilter from "./ReportDateFilter";
import ReportExportButtons from "./ReportExportButtons";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";

function scoreColor(score) {
  if (score >= 80) return "text-emerald-600 bg-emerald-50";
  if (score >= 60) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export default function TeamReports() {
  const [range, setRange] = useState(null);
  const { user } = useAuth();
  const role = useEffectiveRole(user?.role || "user");
  const canSeePayroll = ["admin","shop_manager"].includes(role);

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list("-created_date", 100) });
  const { data: timeEntries = [] } = useQuery({ queryKey: ["timeEntries","all"], queryFn: () => base44.entities.TimeEntry.list("-clock_in", 1000) });
  const { data: qcInspections = [] } = useQuery({ queryKey: ["qcInspections"], queryFn: () => base44.entities.QCInspection.list("-created_date", 500) });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all"], queryFn: () => base44.entities.Estimate.list("-created_date", 500) });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 200) });

  // ── Report 1: Hours by Employee ──────────────────────────────────
  const now = new Date();
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const mo = subMonths(now, 11 - i);
    return { month: format(mo, "MMM yy"), mo };
  });

  const empHours = employees
    .filter(e => e.is_active)
    .map(emp => {
      const entries = timeEntries.filter(t => t.employee_id === emp.id);
      const totalHours = entries.reduce((s,t) => s+(t.duration_hours||0), 0);
      return { name: emp.preferred_name || emp.name, totalHours: parseFloat(totalHours.toFixed(1)), entries };
    })
    .filter(e => e.totalHours > 0)
    .sort((a,b) => b.totalHours - a.totalHours);

  // ── Report 2: Labor Cost per Lnft ────────────────────────────────
  const railingJobs = jobs.filter(j => j.job_type === "Railing" || estimates.find(e => e.job_id === j.id && e.service_category === "Railing"));
  const laborCostPerLnft = employees
    .filter(e => e.is_active && e.hourly_rate)
    .map(emp => {
      let totalLnft = 0;
      let totalLaborCost = 0;
      railingJobs.forEach(j => {
        const est = estimates.find(e => e.job_id === j.id);
        const lnft = est?.railing_lnft || 0;
        const hrs = timeEntries.filter(t => t.employee_id === emp.id && t.job_id === j.id && ["Cut","Fit","Weld","Grind"].includes(t.work_center))
          .reduce((s,t) => s+(t.duration_hours||0), 0);
        totalLnft += lnft > 0 && hrs > 0 ? lnft * (hrs / Math.max(timeEntries.filter(t=>t.job_id===j.id && ["Cut","Fit","Weld","Grind"].includes(t.work_center)).reduce((s,t)=>s+(t.duration_hours||0),0), 1)) : 0;
        totalLaborCost += hrs * (emp.hourly_rate || 25);
      });
      const costPerLnft = totalLnft > 0 ? totalLaborCost / totalLnft : null;
      return { name: emp.preferred_name || emp.name, costPerLnft: costPerLnft ? parseFloat(costPerLnft.toFixed(2)) : null, totalLnft: parseFloat(totalLnft.toFixed(0)) };
    })
    .filter(e => e.costPerLnft !== null);

  // ── Report 3: Craftsman Score ─────────────────────────────────────
  const rolling30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const craftsmanScores = employees
    .filter(e => e.is_active)
    .map(emp => {
      const recentInsp = qcInspections.filter(q => {
        const d = q.created_date ? parseISO(q.created_date) : null;
        return q.employee_id === emp.id && d && d >= rolling30;
      });
      if (recentInsp.length === 0) return null;
      const avgScore = recentInsp.reduce((s,q) => s+(q.overall_score||0), 0) / recentInsp.length;
      const rework = recentInsp.filter(q => q.rework_required).length;
      return { name: emp.preferred_name || emp.name, avgScore: parseFloat(avgScore.toFixed(1)), reworkRate: parseFloat(((rework / recentInsp.length) * 100).toFixed(1)), inspections: recentInsp.length };
    })
    .filter(Boolean)
    .sort((a,b) => b.avgScore - a.avgScore);

  // ── Report 4: Hours Summary (Payroll) ────────────────────────────
  const hoursRows = timeEntries.map(t => ({
    Employee: t.employee_name,
    Date: t.clock_in ? format(parseISO(t.clock_in), "yyyy-MM-dd") : "—",
    Job: t.job_number,
    "Work Center": t.work_center,
    "Clock In": t.clock_in ? format(parseISO(t.clock_in), "HH:mm") : "—",
    "Clock Out": t.clock_out ? format(parseISO(t.clock_out), "HH:mm") : "—",
    "Total Hours": (t.duration_hours || 0).toFixed(2),
  }));

  return (
    <div className="space-y-8">
      <ReportDateFilter onChange={setRange} />

      {/* Report 1 — Hours by Employee */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Hours by Employee</h2>
          <ReportExportButtons getData={() => empHours.map(e => ({ Employee: e.name, "Total Hours": e.totalHours }))} filename="hours-by-employee" />
        </div>
        {empHours.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={empHours} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={v=>`${v} hrs`} />
                <Bar dataKey="totalHours" fill="#3b82f6" name="Total Hours" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8">No time entry data.</p>}
      </section>

      {/* Report 2 — Labor Cost per Lnft (admin/shop_manager only) */}
      {canSeePayroll && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Labor Cost per Linear Foot <span className="text-xs text-muted-foreground font-normal">(Owner / Shop Manager only)</span></h2>
            <ReportExportButtons getData={() => laborCostPerLnft} filename="labor-cost-per-lnft" />
          </div>
          {laborCostPerLnft.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={laborCostPerLnft} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tickFormatter={v=>`$${v}`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={v=>`$${v}/lnft`} />
                  <Bar dataKey="costPerLnft" fill="#8b5cf6" name="$/lnft" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-center text-muted-foreground py-8">No railing jobs with labor rate data.</p>}
        </section>
      )}

      {/* Report 3 — Craftsman Score Leaderboard */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Craftsman Score Leaderboard <span className="text-xs text-muted-foreground font-normal">(Rolling 30 days)</span></h2>
          <ReportExportButtons getData={() => craftsmanScores} filename="craftsman-scores" />
        </div>
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>{["Employee","Avg Score","Rework Rate","Inspections"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {craftsmanScores.map((e,i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{e.name}</td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${scoreColor(e.avgScore)}`}>{e.avgScore}</span></td>
                  <td className="px-3 py-2">{e.reworkRate}%</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.inspections}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {craftsmanScores.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No QC data in last 30 days.</p>}
        </div>
      </section>

      {/* Report 4 — Hours Summary / Payroll */}
      {canSeePayroll && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Employee Hours Summary <span className="text-xs text-muted-foreground font-normal">(Owner / Shop Manager only)</span></h2>
            <ReportExportButtons getData={() => hoursRows} filename="hours-summary" />
          </div>
          <div className="border rounded-lg overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b sticky top-0">
                <tr>{["Employee","Date","Job","Work Center","In","Out","Hours"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {timeEntries.slice(0, 200).map(t => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{t.employee_name}</td>
                    <td className="px-3 py-2 font-mono">{t.clock_in ? format(parseISO(t.clock_in), "MM/dd") : "—"}</td>
                    <td className="px-3 py-2">{t.job_number}</td>
                    <td className="px-3 py-2">{t.work_center}</td>
                    <td className="px-3 py-2 font-mono">{t.clock_in ? format(parseISO(t.clock_in), "HH:mm") : "—"}</td>
                    <td className="px-3 py-2 font-mono">{t.clock_out ? format(parseISO(t.clock_out), "HH:mm") : <span className="text-emerald-600">Active</span>}</td>
                    <td className="px-3 py-2 font-semibold">{(t.duration_hours||0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {timeEntries.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No time entries.</p>}
          </div>
        </section>
      )}
    </div>
  );
}