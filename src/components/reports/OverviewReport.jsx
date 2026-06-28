import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO, format, subMonths } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import KpiCard from "./shared/KpiCard";
import EmptyState from "./shared/EmptyState";
import ReportHeader from "./shared/ReportHeader";

import { useOrgFilter } from "@/lib/orgContext";

const JOB_TYPE_COLORS = ["#1e3a5f", "#f59e0b", "#10b981", "#6366f1", "#f43f5e", "#06b6d4", "#8b5cf6"];

function inRange(dateStr, range) {
  if (!range || !dateStr) return true;
  try { return isWithinInterval(parseISO(dateStr), range); } catch { return false; }
}

export default function OverviewReport({ onTabChange }) {
  const [range, setRange] = useState(null);

  const orgFilter = useOrgFilter();

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs", orgFilter], queryFn: () => base44.entities.Job.filter(orgFilter, "-created_date", 500) });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices", orgFilter], queryFn: () => base44.entities.Invoice.filter(orgFilter, "-created_date", 500) });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all", orgFilter], queryFn: () => base44.entities.Estimate.filter(orgFilter, "-created_date", 500) });

  // ── Date-filtered data ─────────────────────────────────────────────
  const filteredInvoices = invoices.filter(inv =>
    inRange(inv.issued_date || inv.created_date, range)
  );
  const filteredJobs = jobs.filter(j =>
    inRange(j.created_date, range)
  );

  // ── KPIs ────────────────────────────────────────────────────────────
  const totalRevenue = filteredInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0);
  const jobsWon = filteredJobs.filter(j => j.lead_outcome === "Qualified — Won" || ["Approved","Invoiced","In Fabrication","Install Scheduled","Install Complete"].includes(j.status)).length;
  const avgJobSize = jobsWon > 0 ? totalRevenue / jobsWon : 0;
  const closedLeads = filteredJobs.filter(j => j.is_lead_closed || j.lead_outcome);
  const wonLeads = closedLeads.filter(j => j.lead_outcome === "Qualified — Won").length;
  const closeRate = closedLeads.length > 0 ? Math.round((wonLeads / closedLeads.length) * 100) : 0;

  // ── Revenue Over Time ────────────────────────────────────────────────
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const mo = subMonths(now, 11 - i);
    const key = format(mo, "MMM yy");
    const moInvoices = invoices.filter(inv => {
      const d = inv.issued_date ? parseISO(inv.issued_date) : null;
      return d && d.getMonth() === mo.getMonth() && d.getFullYear() === mo.getFullYear();
    });
    return {
      month: key,
      invoiced: moInvoices.reduce((s, i) => s + (i.total || 0), 0),
      collected: moInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0),
    };
  });

  // ── Pipeline Value by Stage ──────────────────────────────────────────
  const stageMap = {};
  jobs.filter(j => !j.is_lead_closed).forEach(j => {
    const stage = j.stage || "Unknown";
    stageMap[stage] = (stageMap[stage] || 0) + (j.estimate_total || 0);
  });
  const pipelineData = Object.entries(stageMap)
    .map(([stage, value]) => ({ stage, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // ── Job Type Breakdown ───────────────────────────────────────────────
  const typeMap = {};
  filteredInvoices.forEach(inv => {
    const job = jobs.find(j => j.id === inv.job_id);
    const type = job?.job_type || "Other";
    typeMap[type] = (typeMap[type] || 0) + (inv.total || 0);
  });
  const pieData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <ReportHeader onRangeChange={setRange} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} onClick={() => onTabChange?.("financial")} />
        <KpiCard label="Jobs Won" value={jobsWon} onClick={() => onTabChange?.("sales")} />
        <KpiCard label="Avg Job Size" value={avgJobSize > 0 ? `$${Math.round(avgJobSize).toLocaleString()}` : "—"} />
        <KpiCard label="Close Rate" value={closeRate > 0 ? `${closeRate}%` : "—"} onClick={() => onTabChange?.("sales")} />
      </div>

      {/* Revenue over time */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Revenue Over Time</h2>
        {months.some(m => m.invoiced > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={months}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="invoiced" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Invoiced" />
                <Line type="monotone" dataKey="collected" stroke="#1e3a5f" strokeWidth={2} dot={false} name="Collected" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState />}
      </section>

      {/* Pipeline + Job Type */}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="space-y-3">
          <h2 className="font-semibold text-sm">Pipeline Value by Stage</h2>
          {pipelineData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                  <Bar dataKey="value" fill="#1e3a5f" radius={[0, 4, 4, 0]} name="Pipeline Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState />}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-sm">Revenue by Job Type</h2>
          {pieData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={JOB_TYPE_COLORS[i % JOB_TYPE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState />}
        </section>
      </div>

    </div>
  );
}