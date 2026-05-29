import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO, format, differenceInDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import ReportDateFilter from "./ReportDateFilter";
import ReportExportButtons from "./ReportExportButtons";

const SERVICE_CATEGORIES = ["Railing","Staircase","Structural","Gate","Planter Box","Wall Wrap","Awning","Other / Custom"];

export default function SalesReports() {
  const [range, setRange] = useState(null);

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 500) });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all"], queryFn: () => base44.entities.Estimate.list("-created_date", 500) });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 500) });

  // ── Report 1: Pipeline Summary ───────────────────────────────────
  const salesJobs = jobs.filter(j => j.pipeline_board === "Sales");

  // ── Report 2: Close Rate by Service Category ─────────────────────
  const closeRateData = SERVICE_CATEGORIES.map(cat => {
    const catEstimates = estimates.filter(e => e.service_category === cat);
    const sent = catEstimates.filter(e => ["Sent","Approved","Rejected"].includes(e.status)).length;
    const approved = catEstimates.filter(e => e.status === "Approved").length;
    const rate = sent > 0 ? parseFloat(((approved / sent) * 100).toFixed(1)) : 0;
    return { category: cat, sent, approved, closeRate: rate };
  }).filter(d => d.sent > 0);

  // ── Report 3: Lead Source Performance ────────────────────────────
  const leadSourceData = {};
  jobs.forEach(j => {
    const src = j.lead_source || "Other";
    if (!leadSourceData[src]) leadSourceData[src] = { source: src, count: 0, revenue: 0 };
    leadSourceData[src].count++;
    if (j.status === "Invoiced") leadSourceData[src].revenue += j.estimate_total || 0;
  });
  const leadSourceChart = Object.values(leadSourceData).sort((a,b) => b.revenue - a.revenue);

  // ── Report 4: Average Job Size Trend ─────────────────────────────
  const now = new Date();
  const avgSizeTrend = Array.from({ length: 12 }, (_, i) => {
    const mo = subMonths(now, 11 - i);
    const monthInvs = invoices.filter(inv => {
      const d = inv.issued_date ? parseISO(inv.issued_date) : null;
      return d && d.getMonth() === mo.getMonth() && d.getFullYear() === mo.getFullYear();
    });
    const avg = monthInvs.length > 0 ? monthInvs.reduce((s,i) => s+(i.total||0), 0) / monthInvs.length : 0;
    return { month: format(mo, "MMM yy"), avgSize: parseFloat(avg.toFixed(0)), count: monthInvs.length };
  });

  // ── Report 5: Sales Velocity ──────────────────────────────────────
  const velocityData = SERVICE_CATEGORIES.map(cat => {
    const catJobs = jobs.filter(j => {
      const est = estimates.find(e => e.job_id === j.id && e.service_category === cat);
      return !!est && j.stage_history && j.stage_history.length > 0;
    });
    const days = catJobs.map(j => {
      const history = j.stage_history || [];
      const firstEntry = history[0];
      const depositEntry = history.find(h => (h.to_stage || "").includes("Deposit Received"));
      if (!firstEntry || !depositEntry) return null;
      return differenceInDays(parseISO(depositEntry.timestamp), parseISO(firstEntry.timestamp));
    }).filter(d => d !== null && d >= 0);
    const avg = days.length > 0 ? days.reduce((s,d)=>s+d,0) / days.length : null;
    return { category: cat, avgDays: avg !== null ? parseFloat(avg.toFixed(1)) : null, sampleSize: days.length };
  }).filter(d => d.avgDays !== null);

  // ── Lead Outcomes (date-range filtered) ──────────────────────────────────
  const allClosedLeads = jobs.filter(j => j.is_lead_closed || j.lead_outcome);
  const closedLeads = allClosedLeads.filter(j => {
    if (!range) return true;
    const d = j.lead_closed_at ? parseISO(j.lead_closed_at) : (j.updated_date ? parseISO(j.updated_date) : null);
    if (!d) return true;
    return isWithinInterval(d, { start: range.start, end: range.end });
  });

  const outcomeCounts = {
    "Unqualified Lead": 0,
    "Qualified — Not Interested": 0,
    "Qualified — Lost": 0,
    "Qualified — Won": 0,
  };
  closedLeads.forEach(j => {
    if (j.lead_outcome && outcomeCounts[j.lead_outcome] !== undefined) {
      outcomeCounts[j.lead_outcome]++;
    }
  });
  const outcomeChartData = Object.entries(outcomeCounts).map(([outcome, count]) => ({ outcome: outcome.replace("Qualified — ", ""), count }));
  const qualifiedWon = outcomeCounts["Qualified — Won"];
  const qualifiedLost = outcomeCounts["Qualified — Lost"];
  const qualifiedNotInterested = outcomeCounts["Qualified — Not Interested"];
  const closeRateDenominator = qualifiedWon + qualifiedLost + qualifiedNotInterested;
  const closeRate = closeRateDenominator > 0 ? ((qualifiedWon / closeRateDenominator) * 100).toFixed(1) : null;

  // Lost reason frequency
  const lostReasons = {};
  closedLeads.filter(j => j.lead_close_reason).forEach(j => {
    const r = j.lead_close_reason.trim();
    lostReasons[r] = (lostReasons[r] || 0) + 1;
  });
  const lostReasonList = Object.entries(lostReasons).sort((a,b) => b[1]-a[1]);

  // Lost To frequency
  const lostToMap = {};
  closedLeads.filter(j => j.lead_lost_to).forEach(j => {
    const r = j.lead_lost_to.trim();
    lostToMap[r] = (lostToMap[r] || 0) + 1;
  });
  const lostToList = Object.entries(lostToMap).sort((a,b) => b[1]-a[1]);

  return (
    <div className="space-y-8">
      <ReportDateFilter onChange={setRange} />

      {/* Lead Outcomes */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Lead Outcomes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Won", value: qualifiedWon, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            { label: "Lost", value: qualifiedLost, color: "text-red-700 bg-red-50 border-red-200" },
            { label: "Not Interested", value: qualifiedNotInterested, color: "text-amber-700 bg-amber-50 border-amber-200" },
            { label: "Unqualified", value: outcomeCounts["Unqualified Lead"], color: "text-muted-foreground bg-muted border-border" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-lg border px-4 py-3 ${color}`}>
              <p className="text-xs font-medium opacity-80">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {closeRate !== null && (
          <div className="flex items-center gap-3 px-4 py-3 bg-card border rounded-lg">
            <div className="text-3xl font-bold text-emerald-600">{closeRate}%</div>
            <div>
              <p className="text-sm font-semibold">Close Rate</p>
              <p className="text-xs text-muted-foreground">Won ÷ (Won + Lost + Not Interested) — Unqualified leads excluded</p>
            </div>
          </div>
        )}

        {closedLeads.length > 0 && (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomeChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="outcome" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" radius={[4,4,0,0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {closedLeads.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-6">No closed leads yet. Close leads from the Sales Board to track outcomes.</p>
        )}

        {lostReasonList.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Most Common Close Reasons</h3>
              <div className="space-y-1.5">
                {lostReasonList.slice(0, 8).map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between text-xs border-b pb-1.5">
                    <span className="text-foreground truncate mr-2">{reason}</span>
                    <span className="font-semibold text-muted-foreground shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            {lostToList.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Lost To (Competitors / Alternatives)</h3>
                <div className="space-y-1.5">
                  {lostToList.slice(0, 8).map(([lostTo, count]) => (
                    <div key={lostTo} className="flex items-center justify-between text-xs border-b pb-1.5">
                      <span className="text-foreground truncate mr-2">{lostTo}</span>
                      <span className="font-semibold text-muted-foreground shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Report 1 — Pipeline Summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Pipeline Summary</h2>
          <ReportExportButtons getData={() => salesJobs.map(j => ({ "Job #": j.job_number, "Job Name": j.job_name, Stage: j.stage, Customer: j.customer_name, "Estimate Total": j.estimate_total || 0, "Days in Stage": j.stage_entered_at ? differenceInDays(new Date(), parseISO(j.stage_entered_at)) : 0 }))} filename="pipeline-summary" />
        </div>
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>{["Job #","Job Name","Customer","Stage","Days in Stage","Est. Amount"].map(h=><th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {salesJobs.map(j => (
                <tr key={j.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono">{j.job_number || "—"}</td>
                  <td className="px-3 py-2">{j.job_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{j.customer_name || "—"}</td>
                  <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">{j.stage || "—"}</span></td>
                  <td className="px-3 py-2">{j.stage_entered_at ? `${differenceInDays(new Date(), parseISO(j.stage_entered_at))}d` : "—"}</td>
                  <td className="px-3 py-2 font-semibold">{j.estimate_total ? `$${j.estimate_total.toLocaleString()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {salesJobs.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No jobs in Sales pipeline.</p>}
        </div>
      </section>

      {/* Report 2 — Close Rate by Service Category */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Close Rate by Service Category</h2>
          <ReportExportButtons getData={() => closeRateData} filename="close-rate" />
        </div>
        {closeRateData.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closeRateData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v,name) => name === "closeRate" ? `${v}%` : v} />
                <Bar dataKey="sent" fill="#94a3b8" name="Sent" radius={[4,4,0,0]} />
                <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8">No estimate data by category yet.</p>}
        {closeRateData.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {closeRateData.map(d => (
              <div key={d.category} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-xs">
                <span className="font-medium">{d.category}</span>
                <span className="text-muted-foreground">{d.sent} sent</span>
                <span className="font-bold text-emerald-600">{d.closeRate}% close</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Report 3 — Lead Source Performance */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Lead Source Performance</h2>
          <ReportExportButtons getData={() => leadSourceChart} filename="lead-source" />
        </div>
        {leadSourceChart.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadSourceChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#f59e0b" name="Revenue Won" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8">No lead source data.</p>}
      </section>

      {/* Report 4 — Average Job Size Trend */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Average Job Size Trend</h2>
          <ReportExportButtons getData={() => avgSizeTrend} filename="avg-job-size" />
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={avgSizeTrend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v=>`$${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="avgSize" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Avg Job Size" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Report 5 — Sales Velocity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Sales Velocity (Days to Close)</h2>
          <ReportExportButtons getData={() => velocityData} filename="sales-velocity" />
        </div>
        {velocityData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v=>`${v} days`} />
                <Bar dataKey="avgDays" fill="#8b5cf6" name="Avg Days to Close" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-center text-muted-foreground py-8">No velocity data available yet.</p>}
      </section>
    </div>
  );
}