import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO, format, differenceInDays, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import KpiCard from "./shared/KpiCard";
import EmptyState from "./shared/EmptyState";
import ReportHeader from "./shared/ReportHeader";
import ReportExportButtons from "./ReportExportButtons";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useOrgFilter } from "@/lib/orgContext";

function inRange(dateStr, range) {
  if (!range || !dateStr) return true;
  try { return isWithinInterval(parseISO(dateStr), range); } catch { return false; }
}

const AGING_BUCKETS = [
  { key: "current", label: "Current (not yet due)", max: 0 },
  { key: "1-7", label: "1–7 days", min: 1, max: 7 },
  { key: "8-14", label: "8–14 days", min: 8, max: 14 },
  { key: "15-30", label: "15–30 days", min: 15, max: 30 },
  { key: "30+", label: "30+ days", min: 31 },
];

function AgingBucket({ bucket, invoices }) {
  const [expanded, setExpanded] = useState(false);
  const total = invoices.reduce((s, i) => s + (i.balance_due || 0), 0);
  if (invoices.length === 0) return null;
  const isOverdue = bucket.key !== "current";

  return (
    <div className={`border rounded-xl overflow-hidden ${isOverdue && bucket.key === "30+" ? "border-red-200" : ""}`}>
      <button
        onClick={() => setExpanded(p => !p)}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold ${isOverdue ? bucket.key === "30+" ? "bg-red-50 text-red-800" : "bg-orange-50 text-orange-800" : "bg-muted/40"}`}
      >
        <span>{bucket.label} — {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
        <div className="flex items-center gap-3">
          <span>${total.toLocaleString()}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {expanded && (
        <table className="w-full text-xs">
          <thead className="bg-muted/30 border-b">
            <tr>
              {["Invoice #", "Job", "Customer", "Amount", "Due Date", "Days Overdue"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-mono">{inv.invoice_number || "—"}</td>
                <td className="px-3 py-2 max-w-[140px] truncate">
                  {inv.job_id ? <Link to={`/jobs/${inv.job_id}`} className="hover:underline text-blue-600">{inv.job_name}</Link> : inv.job_name || "—"}
                </td>
                <td className="px-3 py-2">{inv.customer_name || "—"}</td>
                <td className="px-3 py-2 font-semibold">${(inv.balance_due || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-muted-foreground">{inv.due_date || "—"}</td>
                <td className={`px-3 py-2 font-semibold ${inv.daysOverdue > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {inv.daysOverdue > 0 ? `${inv.daysOverdue}d` : "Current"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function FinancialReport() {
  const [range, setRange] = useState(null);
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const orgFilter = useOrgFilter();

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices", orgFilter], queryFn: () => base44.entities.Invoice.filter(orgFilter, "-created_date", 500) });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs", orgFilter], queryFn: () => base44.entities.Job.filter(orgFilter, "-created_date", 500) });

  const filteredInvoices = invoices.filter(inv => inRange(inv.issued_date || inv.created_date, range));

  // KPIs
  const today = new Date();
  const totalInvoiced = filteredInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = filteredInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = totalInvoiced - totalCollected;
  const overdueInvs = invoices.filter(i => i.status !== "Paid" && i.balance_due > 0 && i.due_date && differenceInDays(today, parseISO(i.due_date)) > 0);
  const overdueAmt = overdueInvs.reduce((s, i) => s + (i.balance_due || 0), 0);

  const paidTimes = invoices
    .filter(i => i.status === "Paid" && i.issued_date && i.paid_date)
    .map(i => differenceInDays(parseISO(i.paid_date), parseISO(i.issued_date)));
  const avgDaysToPay = paidTimes.length > 0 ? Math.round(paidTimes.reduce((s, d) => s + d, 0) / paidTimes.length) : null;

  // Cash flow chart — trailing 12 months
  const now = new Date();
  const cashFlow = Array.from({ length: 12 }, (_, i) => {
    const mo = subMonths(now, 11 - i);
    const moInvs = invoices.filter(inv => {
      const d = inv.issued_date ? parseISO(inv.issued_date) : null;
      return d && d.getMonth() === mo.getMonth() && d.getFullYear() === mo.getFullYear();
    });
    return {
      month: format(mo, "MMM yy"),
      collected: moInvs.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0),
      uncollected: moInvs.filter(i => i.status !== "Paid").reduce((s, i) => s + (i.balance_due || 0), 0),
    };
  });

  // Aging
  const agingInvoices = invoices
    .filter(inv => inv.status !== "Paid" && inv.balance_due > 0)
    .map(inv => {
      const due = inv.due_date ? parseISO(inv.due_date) : null;
      const days = due ? differenceInDays(today, due) : -1;
      return { ...inv, daysOverdue: Math.max(0, days) };
    });

  function getBucket(inv) {
    const d = inv.daysOverdue;
    if (d <= 0) return "current";
    if (d <= 7) return "1-7";
    if (d <= 14) return "8-14";
    if (d <= 30) return "15-30";
    return "30+";
  }

  // Invoice table
  const tableInvoices = filteredInvoices
    .filter(inv => typeFilter === "All" || inv.invoice_type === typeFilter)
    .filter(inv => statusFilter === "All" || inv.status === statusFilter)
    .sort((a, b) => new Date(b.issued_date || b.created_date) - new Date(a.issued_date || a.created_date));

  const tableTotal = { total: 0, paid: 0, balance: 0 };
  tableInvoices.forEach(i => { tableTotal.total += i.total || 0; tableTotal.paid += i.amount_paid || 0; tableTotal.balance += i.balance_due || 0; });

  // Revenue by job type
  const typeRevMap = {};
  filteredInvoices.filter(i => i.status === "Paid").forEach(inv => {
    const job = jobs.find(j => j.id === inv.job_id);
    const type = job?.job_type || inv.service_category || "Other";
    if (!typeRevMap[type]) typeRevMap[type] = { revenue: 0, count: 0 };
    typeRevMap[type].revenue += inv.total || 0;
    typeRevMap[type].count++;
  });
  const typeRevData = Object.entries(typeRevMap)
    .map(([type, d]) => ({ type, ...d }))
    .sort((a, b) => b.revenue - a.revenue);
  const totalRevForPct = typeRevData.reduce((s, d) => s + d.revenue, 0);

  const csvData = () => tableInvoices.map(inv => ({
    "Date Issued": inv.issued_date || "—",
    "Invoice #": inv.invoice_number || "—",
    Type: inv.invoice_type || "—",
    Job: inv.job_name || "—",
    Customer: inv.customer_name || "—",
    Amount: inv.total || 0,
    "Amount Paid": inv.amount_paid || 0,
    Balance: inv.balance_due || 0,
    "Due Date": inv.due_date || "—",
    Status: inv.status,
  }));

  return (
    <div className="space-y-8">
      <ReportHeader onRangeChange={setRange} exportData={csvData} exportFilename="financial-report" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total Invoiced" value={`$${totalInvoiced.toLocaleString()}`} />
        <KpiCard label="Total Collected" value={`$${totalCollected.toLocaleString()}`} />
        <KpiCard label="Outstanding" value={`$${outstanding.toLocaleString()}`} color={outstanding > 0 ? "orange" : "default"} />
        <KpiCard label="Overdue" value={`$${overdueAmt.toLocaleString()}`} color={overdueAmt > 0 ? "red" : "default"} />
        <KpiCard label="Avg Days to Pay" value={avgDaysToPay !== null ? `${avgDaysToPay}d` : "—"} />
      </div>

      {/* Cash flow chart */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Cash Flow (Trailing 12 Months)</h2>
        {cashFlow.some(m => m.collected > 0 || m.uncollected > 0) ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="collected" stackId="a" fill="#1e3a5f" name="Collected" radius={[0, 0, 0, 0]} />
                <Bar dataKey="uncollected" stackId="a" fill="#f59e0b" name="Invoiced / Not Collected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState />}
      </section>

      {/* Aging */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Aging Report</h2>
        {agingInvoices.length > 0 ? (
          <div className="space-y-2">
            {AGING_BUCKETS.map(bucket => (
              <AgingBucket
                key={bucket.key}
                bucket={bucket}
                invoices={agingInvoices.filter(i => getBucket(i) === bucket.key)}
              />
            ))}
          </div>
        ) : (
          <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground bg-emerald-50">No outstanding invoices — all caught up!</div>
        )}
      </section>

      {/* Invoice history table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-sm">Invoice History</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {["All", "Deposit", "Progress", "Final"].map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {["All", "Unpaid", "Paid", "Overdue", "Partial"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
            <ReportExportButtons getData={csvData} filename="invoices" />
          </div>
        </div>
        {tableInvoices.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["Date", "Invoice #", "Type", "Job", "Customer", "Amount", "Paid", "Balance", "Due Date", "Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {tableInvoices.map(inv => {
                  const statusColor = inv.status === "Paid" ? "bg-green-100 text-green-700" : inv.status === "Overdue" ? "bg-red-100 text-red-700" : inv.status === "Partial" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600";
                  return (
                    <tr key={inv.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => inv.job_id && (window.location.href = `/jobs/${inv.job_id}`)}>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{inv.issued_date ? format(parseISO(inv.issued_date), "MMM d") : "—"}</td>
                      <td className="px-3 py-2 font-mono">{inv.invoice_number || "—"}</td>
                      <td className="px-3 py-2">{inv.invoice_type || "—"}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate">{inv.job_name || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{inv.customer_name || "—"}</td>
                      <td className="px-3 py-2 font-semibold">${(inv.total || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-emerald-700">${(inv.amount_paid || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 font-semibold">${(inv.balance_due || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{inv.due_date || "—"}</td>
                      <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor}`}>{inv.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={5} className="px-3 py-2 font-semibold text-xs">Totals</td>
                  <td className="px-3 py-2 font-bold">${tableTotal.total.toLocaleString()}</td>
                  <td className="px-3 py-2 font-bold text-emerald-700">${tableTotal.paid.toLocaleString()}</td>
                  <td className="px-3 py-2 font-bold">${tableTotal.balance.toLocaleString()}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : <EmptyState message="No records found for the selected filters." />}
      </section>

      {/* Revenue by job type */}
      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Revenue by Job Type</h2>
        {typeRevData.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["Job Type", "Jobs Completed", "Total Revenue", "Avg Job Size", "% of Total"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {typeRevData.map(row => (
                  <tr key={row.type} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{row.type}</td>
                    <td className="px-3 py-2">{row.count}</td>
                    <td className="px-3 py-2 font-semibold">${row.revenue.toLocaleString()}</td>
                    <td className="px-3 py-2">${row.count > 0 ? Math.round(row.revenue / row.count).toLocaleString() : "—"}</td>
                    <td className="px-3 py-2">{totalRevForPct > 0 ? `${((row.revenue / totalRevForPct) * 100).toFixed(1)}%` : "—"}</td>
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