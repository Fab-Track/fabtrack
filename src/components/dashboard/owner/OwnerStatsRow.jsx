import React from "react";
import { Briefcase, DollarSign, ShoppingCart, UserCheck, AlertCircle, TrendingUp } from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, color, valueColor }) {
  return (
    <div className="bg-card rounded-xl border p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${valueColor || ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        {Icon && <Icon className="w-4 h-4" />}
      </div>
    </div>
  );
}

const FULL_PIPELINE = [
  { label: "New Lead",          color: "#94a3b8" },
  { label: "Estimate In Progress", color: "#60a5fa" },
  { label: "Estimate Sent",     color: "#3b82f6" },
  { label: "Awaiting Deposit",  color: "#f59e0b" },
  { label: "Approved",          color: "#f97316" },
  { label: "Fab Queue",         color: "#a855f7" },
  { label: "In Fabrication",    color: "#8b5cf6" },
  { label: "Powder Coat",       color: "#fb923c" },
  { label: "Install Scheduled", color: "#22d3ee" },
  { label: "Install Complete",  color: "#10b981" },
  { label: "Invoiced",          color: "#6b7280" },
];

const SALES_STAGES = new Set(["New Lead", "Estimate In Progress", "Estimate Sent", "Awaiting Deposit", "Approved"]);

function getStageKey(job) {
  // Map pipeline board + stage to a FULL_PIPELINE label
  if (job.pipeline_board === "Sales") {
    const s = job.stage || "";
    if (s.includes("New Lead")) return "New Lead";
    if (s.includes("Estimate in Progress") || s.includes("Estimate In Progress")) return "Estimate In Progress";
    if (s.includes("Estimate Sent")) return "Estimate Sent";
    if (s.includes("Awaiting Deposit")) return "Awaiting Deposit";
    if (s.includes("Deposit Received") || s.includes("Approved")) return "Approved";
    return "New Lead";
  }
  // Legacy status field
  const statusMap = {
    "Estimate": "New Lead",
    "Approved": "Approved",
    "Fab Queue": "Fab Queue",
    "In Fabrication": "In Fabrication",
    "Powder Coat": "Powder Coat",
    "Install Scheduled": "Install Scheduled",
    "Install Complete": "Install Complete",
    "Invoiced": "Invoiced",
  };
  return statusMap[job.status] || "New Lead";
}

export default function OwnerStatsRow({ jobs, purchaseOrders, invoices }) {
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

  // Overdue invoices
  const overdueInvoices = (invoices || []).filter(inv => {
    const overdueStages = ["10 Days Overdue","15 Days Overdue","20 Days Overdue","30 Days Overdue","30+ Days Overdue"];
    return inv.status === "Overdue" || overdueStages.includes(inv.stage);
  });
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.balance_due || inv.total || 0), 0);

  // Leads in pipeline (Sales board)
  const leadsInPipeline = jobs.filter(j => j.pipeline_board === "Sales").length;

  // Full pipeline counts
  const pipelineCounts = {};
  FULL_PIPELINE.forEach(p => { pipelineCounts[p.label] = 0; });
  jobs.forEach(j => {
    const key = getStageKey(j);
    if (pipelineCounts[key] !== undefined) pipelineCounts[key]++;
  });
  const total = jobs.length || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Active Jobs" value={activeJobs.length}
          sub={`${pipelineCounts["In Fabrication"]} in fab`}
          icon={Briefcase} color="bg-blue-100 text-blue-700" />
        <StatCard label="Revenue This Month" value={`$${invoicedRevenue.toLocaleString()}`}
          sub={`${invoicedThisMonth.length} jobs invoiced`}
          icon={DollarSign} color="bg-emerald-100 text-emerald-700" />
        <StatCard label="Open POs" value={`$${openPOValue.toLocaleString()}`}
          sub={`${(purchaseOrders || []).filter(po => po.status !== "Received" && po.status !== "Invoiced").length} orders`}
          icon={ShoppingCart} color="bg-amber-100 text-amber-700" />
        <StatCard label="Pending Approval" value={pendingApproval.length}
          sub="Estimates awaiting sign-off"
          icon={UserCheck} color="bg-purple-100 text-purple-700" />
        <StatCard
          label="Overdue Invoices"
          value={overdueInvoices.length > 0 ? `${overdueInvoices.length} / $${overdueTotal.toLocaleString()}` : "0"}
          sub={overdueInvoices.length > 0 ? "Needs attention" : "All current"}
          icon={AlertCircle}
          color={overdueInvoices.length > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}
          valueColor={overdueInvoices.length > 0 ? "text-red-600" : ""}
        />
        <StatCard label="Leads in Pipeline" value={leadsInPipeline}
          sub="In Sales Flow"
          icon={TrendingUp} color="bg-cyan-100 text-cyan-700" />
      </div>

      {/* Full pipeline bar */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Pipeline</p>
          <p className="text-xs text-muted-foreground">{jobs.length} total jobs</p>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-muted gap-0.5">
          {FULL_PIPELINE.map(({ label, color }) => {
            const count = pipelineCounts[label];
            const width = (count / total) * 100;
            return width > 0 ? (
              <div
                key={label}
                style={{ width: `${width}%`, backgroundColor: color }}
                className="rounded-full transition-all"
                title={`${label}: ${count}`}
              />
            ) : null;
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          {FULL_PIPELINE.map(({ label, color }) => {
            const count = pipelineCounts[label];
            if (!count) return null;
            const isSales = SALES_STAGES.has(label);
            return (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className={`text-xs ${isSales ? "text-cyan-600" : "text-muted-foreground"}`}>
                  {label} ({count})
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-2 pt-2 border-t">
          <span className="text-xs text-cyan-600 font-medium">● Sales stages</span>
          <span className="text-xs text-muted-foreground">● Shop / Billing stages</span>
        </div>
      </div>
    </div>
  );
}