import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { DollarSign, AlertCircle, Clock, Briefcase, FileText } from "lucide-react";
import DashKpiCard from "@/components/dashboard/shared/DashKpiCard";
import DashWidget from "@/components/dashboard/shared/DashWidget";
import OwnerUrgentActions from "@/components/dashboard/owner/OwnerUrgentActions";
import PipelineSnapshot from "@/components/dashboard/owner/PipelineSnapshot";
import RecentActivityFeed from "@/components/dashboard/owner/RecentActivityFeed";
import TodaysInstalls from "@/components/dashboard/owner/TodaysInstalls";
import CashFlowMini from "@/components/dashboard/owner/CashFlowMini";

export default function OwnerDashboard() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data: jobs = [], isLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 300), refetchInterval: 5 * 60 * 1000 });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 500), refetchInterval: 5 * 60 * 1000 });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all"], queryFn: () => base44.entities.Estimate.list("-created_date", 300), refetchInterval: 5 * 60 * 1000 });

  const today = new Date();

  // KPIs
  const revenueMTD = invoices.filter(inv => {
    if (inv.status !== "Paid" || !inv.paid_date) return false;
    try { const d = parseISO(inv.paid_date); return d >= monthStart && d <= monthEnd; } catch { return false; }
  }).reduce((s, i) => s + (i.total || 0), 0);

  const outstanding = invoices.filter(i => i.status !== "Paid" && i.balance_due > 0);
  const outstandingAmt = outstanding.reduce((s, i) => s + (i.balance_due || 0), 0);

  const overdueInvoices = invoices.filter(inv => inv.status !== "Paid" && inv.balance_due > 0 && inv.due_date && differenceInDays(today, parseISO(inv.due_date)) > 0);
  const overdueAmt = overdueInvoices.reduce((s, i) => s + (i.balance_due || 0), 0);

  const activeJobs = jobs.filter(j => !j.is_lead_closed && !["Invoiced"].includes(j.status));
  const estimatesPending = estimates.filter(e => e.status === "Sent");

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid lg:grid-cols-2 gap-4">{[1,2].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Row 1 — KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <DashKpiCard label="Revenue MTD" value={`$${revenueMTD.toLocaleString()}`} icon={DollarSign} iconColor="bg-emerald-100 text-emerald-700" />
        <DashKpiCard label="Outstanding" value={`$${outstandingAmt.toLocaleString()}`} sub={`${outstanding.length} invoices`} icon={Clock} iconColor="bg-amber-100 text-amber-700" navigateTo="/reports" />
        <DashKpiCard label="Overdue" value={`$${overdueAmt.toLocaleString()}`} sub={`${overdueInvoices.length} invoices`} icon={AlertCircle} iconColor="bg-red-100 text-red-700" highlight={overdueAmt > 0 ? "red" : undefined} navigateTo="/reports" />
        <DashKpiCard label="Active Jobs" value={activeJobs.length} icon={Briefcase} iconColor="bg-blue-100 text-blue-700" navigateTo="/jobs" />
        <DashKpiCard label="Estimates Pending" value={estimatesPending.length} sub="Awaiting approval" icon={FileText} iconColor="bg-purple-100 text-purple-700" navigateTo="/jobs" />
      </div>

      {/* Row 2 — Urgent Actions */}
      <DashWidget title="Urgent Actions">
        <OwnerUrgentActions jobs={jobs} invoices={invoices} estimates={estimates} />
      </DashWidget>

      {/* Row 3 — Pipeline + Activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DashWidget title="Pipeline Snapshot" action="View Full Pipeline" actionTo="/jobs">
          <PipelineSnapshot jobs={jobs} />
        </DashWidget>
        <DashWidget title="Recent Activity">
          <RecentActivityFeed jobs={jobs} invoices={invoices} estimates={estimates} />
        </DashWidget>
      </div>

      {/* Row 4 — Today's Installs + Cash Flow */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DashWidget title="Today's Installs" action="View Full Schedule" actionTo="/schedule">
          <TodaysInstalls jobs={jobs} />
        </DashWidget>
        <DashWidget title="Cash Flow — Last 30 Days">
          <CashFlowMini invoices={invoices} />
        </DashWidget>
      </div>
    </div>
  );
}