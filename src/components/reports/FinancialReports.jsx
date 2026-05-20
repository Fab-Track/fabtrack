import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO, format, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import ReportDateFilter from "./ReportDateFilter";
import ReportExportButtons from "./ReportExportButtons";

const SERVICE_COLORS = {
  "Railing": "#3b82f6", "Staircase": "#8b5cf6", "Structural": "#f97316",
  "Gate": "#10b981", "Planter Box": "#f59e0b", "Wall Wrap": "#ec4899",
  "Awning": "#06b6d4", "Other / Custom": "#6b7280",
};

function marginColor(pct) {
  if (pct >= 40) return "text-emerald-600 bg-emerald-50";
  if (pct >= 20) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export default function FinancialReports() {
  const [range, setRange] = useState(null);

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 500) });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 500) });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all"], queryFn: () => base44.entities.Estimate.list("-created_date", 500) });
  const { data: timeEntries = [] } = useQuery({ queryKey: ["timeEntries","all"], queryFn: () => base44.entities.TimeEntry.list("-clock_in", 1000) });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ["purchaseOrders"], queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 500) });

  const filteredInvoices = range
    ? invoices.filter(inv => {
        const d = inv.issued_date ? parseISO(inv.issued_date) : inv.created_date ? parseISO(inv.created_date) : null;
        return d && isWithinInterval(d, range);
      })
    : invoices;

  // ── Report 1: Job Profitability ──────────────────────────────────
  const jobProfitability = jobs
    .map(job => {
      const jobInvoices = filteredInvoices.filter(i => i.job_id === job.id);
      if (jobInvoices.length === 0) return null;
      const invoiceTotal = jobInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const jobEstimate = estimates.find(e => e.job_id === job.id && e.status === "Approved");
      const estimatedCost = jobEstimate?.subtotal || 0;
      const laborHours = timeEntries.filter(t => t.job_id === job.id).reduce((s, t) => s + (t.duration_hours || 0), 0);
      const laborCost = laborHours * 25; // default $25/hr fallback
      const poCost = purchaseOrders.filter(po => po.job_id === job.id).reduce((s, po) => s + (po.total || 0), 0);
      const actualCost = laborCost + poCost;
      const grossMarginAmt = invoiceTotal - actualCost;
      const grossMarginPct = invoiceTotal > 0 ? (grossMarginAmt / invoiceTotal) * 100 : 0;
      return {
        "Job #": job.job_number || "—",
        "Job Name": job.job_name,
        "Service Category": jobEstimate?.service_category || "—",
        "Invoice Total": invoiceTotal,
        "Estimated Cost": estimatedCost,
        "Actual Cost": actualCost,
        "Gross Margin $": grossMarginAmt,
        "Gross Margin %": grossMarginPct,
      };
    })
    .filter(Boolean);

  const avgMargin = jobProfitability.length
    ? jobProfitability.reduce((s, j) => s + j["Gross Margin %"], 0) / jobProfitability.length
    : 0;

  // ── Report 2: Profitability by Service Category ──────────────────
  const catData = {};
  jobProfitability.forEach(j => {
    const cat = j["Service Category"] || "Other / Custom";
    if (!catData[cat]) catData[cat] = { revenue: 0, margin: 0, count: 0 };
    catData[cat].revenue += j["Invoice Total"];
    catData[cat].margin += j["Gross Margin %"];
    catData[cat].count++;
  });
  const categoryChart = Object.entries(catData).map(([name, d]) => ({
    name, revenue: d.revenue, avgMargin: d.count > 0 ? d.margin / d.count : 0,
  }));

  // ── Report 3: Revenue Trend ──────────────────────────────────────
  const monthRevenue = {};
  invoices.forEach(inv => {
    const d = inv.issued_date ? parseISO(inv.issued_date) : null;
    if (!d) return;
    const key = format(d, "MMM yyyy");
    monthRevenue[key] = (monthRevenue[key] || 0) + (inv.total || 0);
  });
  const trendData = Object.entries(monthRevenue)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(-12)
    .map(([month, revenue]) => ({ month, revenue }));

  // ── Report 4: Invoice Aging ──────────────────────────────────────
  const today = new Date();
  const agingInvoices = invoices
    .filter(inv => inv.status !== "Paid" && inv.balance_due > 0)
    .map(inv => {
      const due = inv.due_date ? parseISO(inv.due_date) : null;
      const days = due ? differenceInDays(today, due) : 0;
      let bucket = "Current";
      if (days >= 30) bucket = "30d+";
      else if (days >= 20) bucket = "20-29d";
      else if (days >= 15) bucket = "15-19d";
      else if (days >= 10) bucket = "10-14d";
      return { ...inv, daysOverdue: Math.max(0, days), bucket };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const BUCKETS = ["Current", "10-14d", "15-19d", "20-29d", "30d+"];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ReportDateFilter onChange={setRange} />
      </div>

      {/* Report 1 — Job Profitability */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Job Profitability</h2>
          <ReportExportButtons getData={() => jobProfitability} filename="job-profitability" />
        </div>
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>{["Job #","Job Name","Category","Invoice Total","Est. Cost","Actual Cost","Margin $","Margin %"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y">
              {jobProfitability.map((j, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono">{j["Job #"]}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{j["Job Name"]}</td>
                  <td className="px-3 py-2">{j["Service Category"]}</td>
                  <td className="px-3 py-2 font-semibold">${j["Invoice Total"].toLocaleString()}</td>
                  <td className="px-3 py-2 text-muted-foreground">${j["Estimated Cost"].toLocaleString()}</td>
                  <td className="px-3 py-2 text-muted-foreground">${j["Actual Cost"].toLocaleString()}</td>
                  <td className="px-3 py-2">${j["Gross Margin $"].toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${marginColor(j["Gross Margin %"])}`}>
                      {j["Gross Margin %"].toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {jobProfitability.length > 0 && (
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={3} className="px-3 py-2 font-semibold text-xs">Totals / Avg</td>
                  <td className="px-3 py-2 font-bold">${jobProfitability.reduce((s,j)=>s+j["Invoice Total"],0).toLocaleString()}</td>
                  <td colSpan={2}/>
                  <td className="px-3 py-2 font-bold">${jobProfitability.reduce((s,j)=>s+j["Gross Margin $"],0).toLocaleString()}</td>
                  <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${marginColor(avgMargin)}`}>{avgMargin.toFixed(1)}%</span></td>
                </tr>
              </tfoot>
            )}
          </table>
          {jobProfitability.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No invoiced jobs in this period.</p>}
        </div>
      </section>

      {/* Report 2 — Profitability by Service Category */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Profitability by Service Category</h2>
          <ReportExportButtons getData={() => categoryChart.map(c => ({ Category: c.name, Revenue: c.revenue, "Avg Margin %": c.avgMargin.toFixed(1) }))} filename="category-profitability" />
        </div>
        {categoryChart.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => name === "avgMargin" ? `${v.toFixed(1)}%` : `$${v.toLocaleString()}`} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="avgMargin" fill="#10b981" name="Avg Margin %" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8">No data available.</p>}
      </section>

      {/* Report 3 — Revenue Trend */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Revenue Trend (Last 12 Months)</h2>
          <ReportExportButtons getData={() => trendData} filename="revenue-trend" />
        </div>
        {trendData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8">No invoice data available.</p>}
      </section>

      {/* Report 4 — Invoice Aging */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Invoice Aging & Collections</h2>
          <ReportExportButtons getData={() => agingInvoices.map(i => ({ Invoice: i.invoice_number, Customer: i.customer_name, Amount: i.total, Balance: i.balance_due, "Days Overdue": i.daysOverdue, Status: i.status, Bucket: i.bucket }))} filename="invoice-aging" />
        </div>
        {BUCKETS.map(bucket => {
          const bucketInvs = agingInvoices.filter(i => i.bucket === bucket);
          if (bucketInvs.length === 0) return null;
          const bucketTotal = bucketInvs.reduce((s,i) => s + (i.balance_due || 0), 0);
          return (
            <div key={bucket} className="border rounded-lg overflow-hidden">
              <div className={`px-4 py-2 flex items-center justify-between text-xs font-semibold ${bucket === "Current" ? "bg-muted/40" : bucket === "30d+" ? "bg-red-50 text-red-800" : "bg-yellow-50 text-yellow-800"}`}>
                <span>{bucket} — {bucketInvs.length} invoice{bucketInvs.length !== 1 ? "s" : ""}</span>
                <span>${bucketTotal.toLocaleString()}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  {bucketInvs.map(inv => (
                    <tr key={inv.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono">{inv.invoice_number || inv.id.slice(-6).toUpperCase()}</td>
                      <td className="px-3 py-2">{inv.customer_name}</td>
                      <td className="px-3 py-2">{inv.job_name}</td>
                      <td className="px-3 py-2 font-semibold">${(inv.balance_due || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted-foreground">{inv.due_date ? inv.due_date : "—"}</td>
                      <td className="px-3 py-2 font-semibold text-red-600">{inv.daysOverdue > 0 ? `${inv.daysOverdue}d overdue` : "Current"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {agingInvoices.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No outstanding invoices.</p>}
      </section>

      {/* Report 5 — Estimate-to-Actual Variance */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Estimate-to-Actual Cost Variance</h2>
          <ReportExportButtons getData={() => jobs.map(j => {
            const est = estimates.find(e => e.job_id === j.id && e.status === "Approved");
            if (!est) return null;
            const laborCost = timeEntries.filter(t => t.job_id === j.id).reduce((s,t) => s+(t.duration_hours||0)*25, 0);
            const poCost = purchaseOrders.filter(p => p.job_id === j.id).reduce((s,p) => s+(p.total||0), 0);
            const actual = laborCost + poCost;
            const variance = actual - est.total;
            return { Job: j.job_name, Estimated: est.total, Actual: actual, "Variance $": variance, "Variance %": est.total > 0 ? ((variance/est.total)*100).toFixed(1) : 0 };
          }).filter(Boolean)} filename="cost-variance" />
        </div>
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>{["Job Name","Estimated Value","Actual Cost","Variance $","Variance %"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map(j => {
                const est = estimates.find(e => e.job_id === j.id && e.status === "Approved");
                if (!est) return null;
                const laborCost = timeEntries.filter(t => t.job_id === j.id).reduce((s,t) => s+(t.duration_hours||0)*25, 0);
                const poCost = purchaseOrders.filter(p => p.job_id === j.id).reduce((s,p) => s+(p.total||0), 0);
                const actual = laborCost + poCost;
                const variance = actual - est.total;
                const variancePct = est.total > 0 ? (variance / est.total) * 100 : 0;
                return (
                  <tr key={j.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2">{j.job_name}</td>
                    <td className="px-3 py-2">${est.total.toLocaleString()}</td>
                    <td className="px-3 py-2">${actual.toLocaleString()}</td>
                    <td className={`px-3 py-2 font-semibold ${variance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {variance > 0 ? "+" : ""}${variance.toLocaleString()}
                    </td>
                    <td className={`px-3 py-2 font-semibold ${variancePct > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {variancePct > 0 ? "+" : ""}{variancePct.toFixed(1)}%
                    </td>
                  </tr>
                );
              }).filter(Boolean)}
            </tbody>
          </table>
          {!jobs.some(j => estimates.find(e => e.job_id === j.id && e.status === "Approved")) && (
            <p className="text-sm text-center text-muted-foreground py-8">No approved estimates with cost data yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}