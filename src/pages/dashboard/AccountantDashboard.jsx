import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, DollarSign, Clock, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import DashKpiCard from "@/components/dashboard/shared/DashKpiCard";
import DashWidget from "@/components/dashboard/shared/DashWidget";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 300),
    refetchInterval: 5 * 60 * 1000,
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.Invoice.update(id, { status: "Paid", paid_date: new Date().toISOString().split("T")[0], balance_due: 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Marked as paid"); },
  });

  const mtdInvoices = invoices.filter(inv => {
    const d = inv.issued_date ? parseISO(inv.issued_date) : null;
    return d && d >= monthStart && d <= monthEnd;
  });
  const totalInvoicedMTD = mtdInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const collectedMTD = invoices.filter(inv => {
    const d = inv.paid_date ? parseISO(inv.paid_date) : null;
    return d && d >= monthStart && d <= monthEnd;
  }).reduce((s, i) => s + (i.total || 0), 0);

  const outstanding = invoices
    .filter(i => i.status !== "Paid" && i.balance_due > 0)
    .reduce((s, i) => s + (i.balance_due || 0), 0);

  const overdueInvoices = invoices
    .filter(inv => inv.status !== "Paid" && inv.balance_due > 0 && inv.due_date && differenceInDays(today, parseISO(inv.due_date)) > 0)
    .map(inv => ({ ...inv, daysOverdue: differenceInDays(today, parseISO(inv.due_date)) }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
  const overdueAmt = overdueInvoices.reduce((s, i) => s + (i.balance_due || 0), 0);

  const paidTimes = invoices.filter(i => i.status === "Paid" && i.issued_date && i.paid_date)
    .map(i => differenceInDays(parseISO(i.paid_date), parseISO(i.issued_date)));
  const avgDaysToPay = paidTimes.length > 0 ? Math.round(paidTimes.reduce((s, d) => s + d, 0) / paidTimes.length) : null;

  const dueSoon = invoices
    .filter(inv => {
      if (inv.status === "Paid") return false;
      if (!inv.due_date) return false;
      const daysUntil = differenceInDays(parseISO(inv.due_date), today);
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .map(inv => ({ ...inv, daysUntil: differenceInDays(parseISO(inv.due_date), today) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const recentPayments = invoices
    .filter(i => i.status === "Paid" && i.paid_date)
    .sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date))
    .slice(0, 10);

  const uninvoicedJobs = jobs.filter(j =>
    j.status === "Install Complete" &&
    !invoices.some(inv => inv.job_id === j.id && inv.invoice_type === "Final" && inv.status !== "Draft")
  );

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <DashKpiCard label="Invoiced MTD" value={`$${totalInvoicedMTD.toLocaleString()}`} icon={DollarSign} iconColor="bg-blue-100 text-blue-700" />
        <DashKpiCard label="Collected MTD" value={`$${collectedMTD.toLocaleString()}`} icon={CheckCircle2} iconColor="bg-emerald-100 text-emerald-700" />
        <DashKpiCard label="Outstanding" value={`$${outstanding.toLocaleString()}`} icon={Clock} iconColor="bg-amber-100 text-amber-700" highlight={outstanding > 0 ? "orange" : undefined} />
        <DashKpiCard label="Overdue" value={`$${overdueAmt.toLocaleString()}`} icon={AlertCircle} iconColor="bg-red-100 text-red-700" highlight={overdueAmt > 0 ? "red" : undefined} navigateTo="/reports" />
        <DashKpiCard label="Avg Days to Pay" value={avgDaysToPay !== null ? `${avgDaysToPay}d` : "—"} icon={TrendingUp} iconColor="bg-purple-100 text-purple-700" />
      </div>

      {/* Overdue invoices */}
      <DashWidget title="Overdue Invoices — Priority Action">
        {overdueInvoices.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">No overdue invoices. Great shape!</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>{["Customer","Invoice #","Job","Amount","Due Date","Days Overdue",""].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {overdueInvoices.map(inv => (
                  <tr key={inv.id} className={`hover:bg-muted/20 ${inv.daysOverdue >= 14 ? "bg-red-50/40" : ""}`}>
                    <td className="px-3 py-2 font-medium">{inv.customer_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{inv.invoice_number || "—"}</td>
                    <td className="px-3 py-2 max-w-[120px] truncate">{inv.job_name || "—"}</td>
                    <td className="px-3 py-2 font-semibold">${(inv.balance_due || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{inv.due_date}</td>
                    <td className={`px-3 py-2 font-bold ${inv.daysOverdue >= 14 ? "text-red-600" : "text-orange-600"}`}>{inv.daysOverdue}d</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => navigate(`/jobs/${inv.job_id}`)}>Send Reminder</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => markPaidMutation.mutate({ id: inv.id })} disabled={markPaidMutation.isPending}>Mark Paid</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashWidget>

      {/* Due this week */}
      <DashWidget title="Invoices Due This Week" action="View All" actionTo="/reports">
        {dueSoon.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No invoices due in the next 7 days.</p>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>{["Customer","Invoice #","Amount","Due Date","Days Until Due",""].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {dueSoon.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{inv.customer_name || "—"}</td>
                    <td className="px-3 py-2 font-mono">{inv.invoice_number || "—"}</td>
                    <td className="px-3 py-2 font-semibold">${(inv.balance_due || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{inv.due_date}</td>
                    <td className={`px-3 py-2 font-semibold ${inv.daysUntil <= 2 ? "text-orange-600" : ""}`}>{inv.daysUntil === 0 ? "Today" : `${inv.daysUntil}d`}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => navigate(`/jobs/${inv.job_id}`)}>Send Reminder</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashWidget>

      {/* Recent payments + Uninvoiced jobs */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DashWidget title="Recent Payments Received">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recentPayments.map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium">{inv.customer_name}</p>
                    <p className="text-muted-foreground">{inv.invoice_number} · {inv.paid_date}</p>
                  </div>
                  <p className="font-bold text-emerald-600">${(inv.total || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </DashWidget>

        <DashWidget title="Invoices Ready to Send">
          {uninvoicedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">All completed jobs have invoices. 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {uninvoicedJobs.map(j => (
                <div key={j.id} className="flex items-start justify-between gap-2 text-xs py-1.5 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{j.job_name}</p>
                    <p className="text-muted-foreground">{j.customer_name}{j.estimate_total ? ` · $${j.estimate_total.toLocaleString()}` : ""}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 shrink-0" onClick={() => navigate(`/jobs/${j.id}`)}>
                    Create Invoice
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DashWidget>
      </div>
    </div>
  );
}