import React from "react";
import { Briefcase, DollarSign, ShoppingCart, UserCheck } from "lucide-react";
import { JOB_STATUSES } from "@/lib/jobHelpers";

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-xl border p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
    </div>
  );
}

export default function StatsRow({ jobs, purchaseOrders }) {
  const activeJobs = jobs.filter(j => !["Invoiced", "Estimate"].includes(j.status));
  const invoicedThisMonth = jobs.filter(j => {
    if (j.status !== "Invoiced") return false;
    const d = new Date(j.updated_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const invoicedRevenue = invoicedThisMonth.reduce((s, j) => s + (j.estimate_total || 0), 0);
  const openPOValue = (purchaseOrders || [])
    .filter(po => po.status !== "Received" && po.status !== "Invoiced")
    .reduce((s, po) => s + (po.total || 0), 0);
  const pendingApproval = jobs.filter(j => j.customer_approval_status === "pending" && j.status === "Estimate");

  // Pipeline count by status
  const pipeline = {};
  JOB_STATUSES.forEach(s => { pipeline[s] = 0; });
  jobs.forEach(j => { if (pipeline[j.status] !== undefined) pipeline[j.status]++; });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Active Jobs"
          value={activeJobs.length}
          sub={`${pipeline["In Fabrication"]} in fab, ${pipeline["Install Scheduled"]} to install`}
          icon={Briefcase}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Revenue This Month"
          value={`$${invoicedRevenue.toLocaleString()}`}
          sub={`${invoicedThisMonth.length} jobs invoiced`}
          icon={DollarSign}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Open POs"
          value={`$${openPOValue.toLocaleString()}`}
          sub={`${(purchaseOrders || []).filter(po => po.status !== "Received" && po.status !== "Invoiced").length} orders`}
          icon={ShoppingCart}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label="Pending Approval"
          value={pendingApproval.length}
          sub="Estimates awaiting sign-off"
          icon={UserCheck}
          color="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Pipeline mini bar */}
      <div className="bg-card rounded-xl border p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pipeline</p>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
          {JOB_STATUSES.map((status, i) => {
            const count = pipeline[status];
            const total = jobs.length || 1;
            const width = (count / total) * 100;
            const colors = [
              "bg-gray-400", "bg-blue-500", "bg-purple-500", "bg-amber-500",
              "bg-orange-500", "bg-cyan-500", "bg-emerald-500", "bg-gray-300"
            ];
            return width > 0 ? (
              <div
                key={status}
                className={`${colors[i]} rounded-full transition-all`}
                style={{ width: `${width}%` }}
                title={`${status}: ${count}`}
              />
            ) : null;
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {JOB_STATUSES.map((status, i) => {
            const count = pipeline[status];
            if (count === 0) return null;
            const dotColors = [
              "bg-gray-400", "bg-blue-500", "bg-purple-500", "bg-amber-500",
              "bg-orange-500", "bg-cyan-500", "bg-emerald-500", "bg-gray-300"
            ];
            return (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${dotColors[i]}`} />
                <span className="text-xs text-muted-foreground">{status} ({count})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}