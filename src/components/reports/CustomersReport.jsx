import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO, format, differenceInDays, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import KpiCard from "./shared/KpiCard";
import EmptyState from "./shared/EmptyState";
import ReportHeader from "./shared/ReportHeader";
import ReportExportButtons from "./ReportExportButtons";
import { Link } from "react-router-dom";
import { Eye, Send } from "lucide-react";

function inRange(dateStr, range) {
  if (!range || !dateStr) return true;
  try { return isWithinInterval(parseISO(dateStr), range); } catch { return false; }
}

export default function CustomersReport() {
  const [range, setRange] = useState(null);
  const [showAllCustomers, setShowAllCustomers] = useState(false);

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 500) });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 500) });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 500) });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all"], queryFn: () => base44.entities.Estimate.list("-created_date", 500) });

  // ── KPIs ────────────────────────────────────────────────────────────
  const totalCustomers = customers.length;
  const newCustomers = customers.filter(c => inRange(c.created_date, range)).length;

  // Repeat customers: had more than 1 job
  const jobsPerCustomer = {};
  jobs.forEach(j => {
    if (!j.customer_id) return;
    jobsPerCustomer[j.customer_id] = (jobsPerCustomer[j.customer_id] || 0) + 1;
  });
  const repeatCustomers = Object.values(jobsPerCustomer).filter(count => count > 1).length;
  const repeatPct = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  // ── Top customers by revenue ──────────────────────────────────────────
  const customerStats = customers.map(c => {
    const cJobs = jobs.filter(j => j.customer_id === c.id);
    const cInvoices = invoices.filter(i => i.customer_id === c.id);
    const revenue = cInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = cInvoices.filter(i => i.status !== "Paid").reduce((s, i) => s + (i.balance_due || 0), 0);
    const lastJobDate = cJobs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]?.created_date;
    return { ...c, jobCount: cJobs.length, revenue, outstanding, lastJobDate };
  }).sort((a, b) => b.revenue - a.revenue);

  const topCustomers = showAllCustomers ? customerStats : customerStats.slice(0, 10);

  // ── Customer acquisition ──────────────────────────────────────────────
  const now = new Date();
  const acquisitionData = Array.from({ length: 12 }, (_, i) => {
    const mo = subMonths(now, 11 - i);
    const count = customers.filter(c => {
      const d = c.created_date ? parseISO(c.created_date) : null;
      return d && d.getMonth() === mo.getMonth() && d.getFullYear() === mo.getFullYear();
    }).length;
    return { month: format(mo, "MMM yy"), count };
  });

  // ── Customers with open estimates ────────────────────────────────────
  const openEstimates = estimates
    .filter(e => e.status === "Sent")
    .map(e => {
      const job = jobs.find(j => j.id === e.job_id);
      const customer = job?.customer_id ? customers.find(c => c.id === job.customer_id) : null;
      const daysSince = e.created_date ? differenceInDays(new Date(), parseISO(e.created_date)) : 0;
      return { ...e, job_name: job?.job_name || "—", customer_name: job?.customer_name || "—", customer_id: job?.customer_id, daysSince };
    })
    .sort((a, b) => b.daysSince - a.daysSince);

  // ── Outstanding balances ──────────────────────────────────────────────
  const outstandingInvoices = invoices
    .filter(i => i.status !== "Paid" && i.balance_due > 0)
    .map(i => {
      const daysOverdue = i.due_date ? Math.max(0, differenceInDays(new Date(), parseISO(i.due_date))) : 0;
      return { ...i, daysOverdue };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const csvData = () => topCustomers.map(c => ({
    Customer: c.name,
    Jobs: c.jobCount,
    Revenue: c.revenue,
    "Last Job Date": c.lastJobDate || "—",
    "Outstanding Balance": c.outstanding,
  }));

  return (
    <div className="space-y-8">
      <ReportHeader onRangeChange={setRange} exportData={csvData} exportFilename="customers-report" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Customers" value={totalCustomers} />
        <KpiCard label="New Customers" value={newCustomers} compLabel="in selected period" />
        <KpiCard label="Repeat Customer Rate" value={`${repeatPct}%`} compLabel={`${repeatCustomers} customers with 2+ jobs`} />
      </div>

      {/* Top customers table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Top Customers by Revenue</h2>
          <ReportExportButtons getData={csvData} filename="top-customers" />
        </div>
        {customerStats.length > 0 ? (
          <>
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    {["#", "Customer", "Jobs", "Total Revenue", "Last Job", "Outstanding"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topCustomers.map((c, i) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        <Link to={`/customers`} className="hover:underline text-blue-600">{c.name}</Link>
                      </td>
                      <td className="px-3 py-2">{c.jobCount}</td>
                      <td className="px-3 py-2 font-semibold">{c.revenue > 0 ? `$${c.revenue.toLocaleString()}` : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.lastJobDate ? format(parseISO(c.lastJobDate), "MMM d, yyyy") : "—"}</td>
                      <td className={`px-3 py-2 font-semibold ${c.outstanding > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                        {c.outstanding > 0 ? `$${c.outstanding.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {customerStats.length > 10 && (
              <button onClick={() => setShowAllCustomers(p => !p)} className="text-xs text-blue-600 hover:underline">
                {showAllCustomers ? "Show top 10 only" : `Show all ${customerStats.length} customers`}
              </button>
            )}
          </>
        ) : <EmptyState message="No customer revenue data yet." />}
      </section>

      {/* Acquisition chart */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Customer Acquisition (Trailing 12 Months)</h2>
        {acquisitionData.some(m => m.count > 0) ? (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acquisitionData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e3a5f" name="New Customers" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState />}
      </section>

      {/* Open estimates */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Customers with Open Estimates</h2>
        {openEstimates.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["Customer", "Job", "Amount", "Date Sent", "Days Waiting", ""].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {openEstimates.map(e => (
                  <tr key={e.id} className={`hover:bg-muted/20 ${e.daysSince > 14 ? "bg-red-50/40" : ""}`}>
                    <td className="px-3 py-2 font-medium">{e.customer_name}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{e.job_name}</td>
                    <td className="px-3 py-2 font-semibold">{e.total ? `$${e.total.toLocaleString()}` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.created_date ? format(parseISO(e.created_date), "MMM d") : "—"}</td>
                    <td className={`px-3 py-2 font-semibold ${e.daysSince > 7 ? "text-red-600" : ""}`}>{e.daysSince}d</td>
                    <td className="px-3 py-2">
                      {e.job_id && (
                        <Link to={`/jobs/${e.job_id}`} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                          <Eye className="w-3 h-3" />View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground bg-emerald-50">No open estimates waiting on customer approval.</div>
        )}
      </section>

      {/* Outstanding balances */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Customers with Outstanding Balances</h2>
        {outstandingInvoices.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["Customer", "Invoice #", "Amount Due", "Due Date", "Days Overdue", ""].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {outstandingInvoices.map(inv => (
                  <tr key={inv.id} className={`hover:bg-muted/20 ${inv.daysOverdue > 0 ? "bg-red-50/30" : ""}`}>
                    <td className="px-3 py-2 font-medium">{inv.customer_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{inv.invoice_number || "—"}</td>
                    <td className="px-3 py-2 font-semibold">${(inv.balance_due || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-muted-foreground">{inv.due_date || "—"}</td>
                    <td className={`px-3 py-2 font-semibold ${inv.daysOverdue > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {inv.daysOverdue > 0 ? `${inv.daysOverdue}d` : "Not yet due"}
                    </td>
                    <td className="px-3 py-2">
                      {inv.job_id && (
                        <Link to={`/jobs/${inv.job_id}`} className="text-[10px] text-blue-600 hover:underline">View</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground bg-emerald-50">No outstanding customer balances.</div>
        )}
      </section>
    </div>
  );
}