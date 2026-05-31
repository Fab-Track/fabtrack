import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO, format, differenceInDays } from "date-fns";
import {
  FunnelChart, Funnel, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from "recharts";
import KpiCard from "./shared/KpiCard";
import EmptyState from "./shared/EmptyState";
import ReportHeader from "./shared/ReportHeader";
import ReportExportButtons from "./ReportExportButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Eye, Send } from "lucide-react";

const STATUS_COLORS = {
  Sent: "bg-blue-100 text-blue-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Draft: "bg-gray-100 text-gray-600",
};

function inRange(dateStr, range) {
  if (!range || !dateStr) return true;
  try { return isWithinInterval(parseISO(dateStr), range); } catch { return false; }
}

export default function SalesReport() {
  const [range, setRange] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 500) });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all"], queryFn: () => base44.entities.Estimate.list("-created_date", 500) });

  const filteredEstimates = estimates.filter(e => inRange(e.created_date, range));

  const sent = filteredEstimates.filter(e => ["Sent", "Approved", "Rejected"].includes(e.status)).length;
  const approved = filteredEstimates.filter(e => e.status === "Approved").length;
  const rejected = filteredEstimates.filter(e => e.status === "Rejected").length;
  const closeRate = sent > 0 ? Math.round((approved / sent) * 100) : 0;

  const approvalTimes = filteredEstimates
    .filter(e => e.status === "Approved" && e.approved_date && e.created_date)
    .map(e => differenceInDays(parseISO(e.approved_date), parseISO(e.created_date)));
  const avgApprovalDays = approvalTimes.length > 0
    ? (approvalTimes.reduce((s, d) => s + d, 0) / approvalTimes.length).toFixed(1)
    : null;

  // Funnel data
  const funnelStages = [
    { name: "New Lead", value: jobs.filter(j => inRange(j.created_date, range)).length, fill: "#1e3a5f" },
    { name: "Est. Sent", value: sent, fill: "#3b82f6" },
    { name: "Approved", value: approved, fill: "#10b981" },
    { name: "Deposit Rcvd", value: jobs.filter(j => j.stage === "Deposit Received" && inRange(j.created_date, range)).length, fill: "#f59e0b" },
  ].filter(s => s.value > 0);

  // Status-filtered table
  const tableEstimates = filteredEstimates
    .filter(e => statusFilter === "All" || e.status === statusFilter)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Win/Loss donut
  const winLossData = [
    { name: "Approved", value: approved, color: "#10b981" },
    { name: "Rejected", value: rejected, color: "#f43f5e" },
    { name: "Pending", value: sent - approved - rejected, color: "#94a3b8" },
  ].filter(d => d.value > 0);

  const approvedRevenue = filteredEstimates.filter(e => e.status === "Approved").reduce((s, e) => s + (e.total || 0), 0);
  const rejectedRevenue = filteredEstimates.filter(e => e.status === "Rejected").reduce((s, e) => s + (e.total || 0), 0);

  // Top jobs
  const topJobs = filteredEstimates
    .filter(e => e.total > 0)
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 10)
    .map(e => {
      const job = jobs.find(j => j.id === e.job_id);
      return { ...e, job_name: job?.job_name || "—", customer_name: job?.customer_name || "—", job_id: e.job_id };
    });

  const csvData = () => tableEstimates.map(e => {
    const job = jobs.find(j => j.id === e.job_id);
    return {
      "Date Sent": e.created_date || "—",
      "Estimate #": e.id?.slice(-8).toUpperCase(),
      Job: job?.job_name || "—",
      Customer: job?.customer_name || "—",
      Amount: e.total || 0,
      Status: e.status,
      "Days Since Sent": e.created_date ? differenceInDays(new Date(), parseISO(e.created_date)) : "—",
    };
  });

  return (
    <div className="space-y-8">
      <ReportHeader onRangeChange={setRange} exportData={csvData} exportFilename="sales-report" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Estimates Sent" value={sent} />
        <KpiCard label="Estimates Approved" value={approved} />
        <KpiCard label="Close Rate" value={sent > 0 ? `${closeRate}%` : "—"} />
        <KpiCard label="Avg Time to Approve" value={avgApprovalDays ? `${avgApprovalDays}d` : "—"} />
      </div>

      {/* Funnel */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Sales Pipeline Funnel</h2>
        {funnelStages.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip formatter={v => `${v} jobs`} />
                <Funnel dataKey="value" data={funnelStages} isAnimationActive>
                  <LabelList position="right" fill="#000" stroke="none" dataKey="name" style={{ fontSize: 11 }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState />}
      </section>

      {/* Estimates table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-sm">Estimates</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {["All", "Sent", "Approved", "Rejected", "Draft"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
            <ReportExportButtons getData={csvData} filename="estimates" />
          </div>
        </div>
        {tableEstimates.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["Date", "Job", "Customer", "Amount", "Status", "Days Since Sent", ""].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {tableEstimates.map(e => {
                  const job = jobs.find(j => j.id === e.job_id);
                  const daysSince = e.created_date ? differenceInDays(new Date(), parseISO(e.created_date)) : null;
                  const isStale = e.status === "Sent" && daysSince > 7;
                  return (
                    <tr key={e.id} className={`hover:bg-muted/20 ${isStale ? "bg-red-50/50" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{e.created_date ? format(parseISO(e.created_date), "MMM d") : "—"}</td>
                      <td className="px-3 py-2 font-medium max-w-[160px] truncate">{job?.job_name || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{job?.customer_name || "—"}</td>
                      <td className="px-3 py-2 font-semibold">{e.total ? `$${e.total.toLocaleString()}` : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLORS[e.status] || "bg-gray-100 text-gray-600"}`}>{e.status}</span>
                      </td>
                      <td className="px-3 py-2">{daysSince !== null ? `${daysSince}d` : "—"}</td>
                      <td className="px-3 py-2">
                        {e.job_id && (
                          <Link to={`/jobs/${e.job_id}`} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                            <Eye className="w-3 h-3" />View
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No records found for the selected filters." />}
      </section>

      {/* Win/Loss Analysis */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Win / Loss Analysis</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">By Count</p>
            {winLossData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={winLossData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {winLossData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState />}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">By Revenue</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: "Won", value: approvedRevenue }, { name: "Lost", value: rejectedRevenue }]}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {sent > 0 && (
          <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 border">
            You won <strong>{approved}</strong> of <strong>{sent}</strong> estimates this period for <strong>${approvedRevenue.toLocaleString()}</strong> in approved revenue.
            {sent - approved - rejected > 0 && ` ${sent - approved - rejected} estimate${sent - approved - rejected > 1 ? "s are" : " is"} still pending.`}
          </p>
        )}
      </section>

      {/* Top jobs */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Top Jobs by Estimate Value</h2>
        {topJobs.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["#", "Job", "Customer", "Amount", "Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {topJobs.map((e, i) => (
                  <tr key={e.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/jobs/${e.job_id}`} className="hover:underline text-blue-600">{e.job_name}</Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{e.customer_name}</td>
                    <td className="px-3 py-2 font-semibold">${(e.total || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLORS[e.status] || "bg-gray-100 text-gray-600"}`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No records found for the selected filters." />}
      </section>
    </div>
  );
}