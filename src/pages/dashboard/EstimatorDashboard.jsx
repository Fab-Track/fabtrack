import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth } from "date-fns";
import { FileText, CheckCircle2, TrendingUp, DollarSign, Clock } from "lucide-react";
import DashKpiCard from "@/components/dashboard/shared/DashKpiCard";
import DashWidget from "@/components/dashboard/shared/DashWidget";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

const STATUS_COLORS = {
  Sent: "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Draft: "bg-gray-100 text-gray-600",
};

export default function EstimatorDashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const today = new Date();

  const { data: jobs = [], isLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list("-created_date", 300), refetchInterval: 5 * 60 * 1000 });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates-all"], queryFn: () => base44.entities.Estimate.list("-created_date", 300), refetchInterval: 5 * 60 * 1000 });

  // KPIs
  const mtdEstimates = estimates.filter(e => {
    const d = e.created_date ? parseISO(e.created_date) : null;
    return d && d >= monthStart && d <= monthEnd;
  });
  const sentMTD = mtdEstimates.filter(e => ["Sent","Approved","Rejected"].includes(e.status)).length;
  const approvedMTD = mtdEstimates.filter(e => e.status === "Approved").length;
  const closeRateMTD = sentMTD > 0 ? Math.round((approvedMTD / sentMTD) * 100) : 0;
  const pipelineValue = estimates
    .filter(e => e.status === "Sent")
    .reduce((s, e) => s + (e.total || 0), 0);

  // Action-required estimates (sent, not approved)
  const actionRequired = estimates
    .filter(e => e.status === "Sent")
    .map(e => {
      const job = jobs.find(j => j.id === e.job_id);
      const daysSince = e.created_date ? differenceInDays(today, parseISO(e.created_date)) : 0;
      return { ...e, job_name: job?.job_name || "—", customer_name: job?.customer_name || "—", job_id: e.job_id, daysSince };
    })
    .sort((a, b) => b.daysSince - a.daysSince);

  // Recently approved
  const recentApproved = estimates
    .filter(e => e.status === "Approved" && e.approved_date)
    .sort((a, b) => new Date(b.approved_date) - new Date(a.approved_date))
    .slice(0, 5)
    .map(e => {
      const job = jobs.find(j => j.id === e.job_id);
      return { ...e, job_name: job?.job_name || "—", customer_name: job?.customer_name || "—" };
    });

  // Recently rejected/lost
  const recentRejected = estimates
    .filter(e => e.status === "Rejected" && e.created_date)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5)
    .map(e => {
      const job = jobs.find(j => j.id === e.job_id);
      return { ...e, job_name: job?.job_name || "—", customer_name: job?.customer_name || "—" };
    });

  // Expiring estimates (7+ days sent, not approved)
  const expiring = actionRequired.filter(e => e.daysSince >= 7);

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashKpiCard label="Estimates Sent (MTD)" value={sentMTD} icon={FileText} iconColor="bg-blue-100 text-blue-700" />
        <DashKpiCard label="Approved (MTD)" value={approvedMTD} icon={CheckCircle2} iconColor="bg-emerald-100 text-emerald-700" />
        <DashKpiCard label="Close Rate (MTD)" value={sentMTD > 0 ? `${closeRateMTD}%` : "—"} icon={TrendingUp} iconColor="bg-purple-100 text-purple-700" />
        <DashKpiCard label="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} sub="Awaiting approval" icon={DollarSign} iconColor="bg-amber-100 text-amber-700" />
      </div>

      {/* Action-required table */}
      <DashWidget title="My Estimates — Action Required">
        {actionRequired.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No estimates pending approval right now.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate("/jobs/new")}>Create New Estimate</Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>{["Customer","Job","Amount","Date Sent","Days Waiting","Status",""].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {actionRequired.map(e => (
                  <tr key={e.id} className={`hover:bg-muted/20 ${e.daysSince >= 7 ? "bg-orange-50/40" : ""}`}>
                    <td className="px-3 py-2 font-medium">{e.customer_name}</td>
                    <td className="px-3 py-2 max-w-[140px] truncate">{e.job_name}</td>
                    <td className="px-3 py-2 font-semibold">{e.total ? `$${e.total.toLocaleString()}` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.created_date ? format(parseISO(e.created_date), "MMM d") : "—"}</td>
                    <td className={`px-3 py-2 font-semibold ${e.daysSince >= 7 ? "text-orange-600" : ""}`}>{e.daysSince}d</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLORS[e.status] || ""}`}>{e.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 whitespace-nowrap"
                          onClick={() => navigate(`/jobs/${e.job_id}`)}>Send Follow-Up</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 whitespace-nowrap"
                          onClick={() => navigate(`/jobs/${e.job_id}`)}>View</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashWidget>

      {/* Approved + Rejected panels */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DashWidget title="Recently Approved">
          {recentApproved.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No approved estimates yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recentApproved.map(e => (
                <div key={e.id} className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.customer_name}</p>
                    <p className="text-muted-foreground truncate">{e.job_name} {e.total ? `· $${e.total.toLocaleString()}` : ""}</p>
                    <p className="text-[10px] text-muted-foreground">{e.approved_date ? format(parseISO(e.approved_date), "MMM d") : "—"}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 shrink-0 whitespace-nowrap"
                    onClick={() => navigate(`/jobs/${e.job_id}`)}>Create Invoice</Button>
                </div>
              ))}
            </div>
          )}
        </DashWidget>

        <DashWidget title="Recently Lost / Declined">
          {recentRejected.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No declined estimates yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recentRejected.map(e => (
                <div key={e.id} className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.customer_name}</p>
                    <p className="text-muted-foreground truncate">{e.job_name} {e.total ? `· $${e.total.toLocaleString()}` : ""}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 shrink-0"
                    onClick={() => navigate(`/jobs/${e.job_id}`)}>Requote</Button>
                </div>
              ))}
            </div>
          )}
        </DashWidget>
      </div>

      {/* Expiring estimates */}
      {expiring.length > 0 && (
        <DashWidget title="Upcoming Estimate Expirations (7+ days, no approval)">
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b">
                <tr>{["Customer","Job","Amount","Date Sent","Days Waiting",""].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {expiring.map(e => (
                  <tr key={e.id} className={`hover:bg-muted/20 ${e.daysSince >= 14 ? "bg-red-50/40" : "bg-orange-50/30"}`}>
                    <td className="px-3 py-2 font-medium">{e.customer_name}</td>
                    <td className="px-3 py-2 max-w-[140px] truncate">{e.job_name}</td>
                    <td className="px-3 py-2 font-semibold">{e.total ? `$${e.total.toLocaleString()}` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.created_date ? format(parseISO(e.created_date), "MMM d") : "—"}</td>
                    <td className={`px-3 py-2 font-bold ${e.daysSince >= 14 ? "text-red-600" : "text-orange-600"}`}>{e.daysSince}d</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                        onClick={() => navigate(`/jobs/${e.job_id}`)}>Send Reminder</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashWidget>
      )}
    </div>
  );
}