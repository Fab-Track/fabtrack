import React, { useState } from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import { AlertCircle, Clock, FileText, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PRIORITY = { red: 0, orange: 1, yellow: 2 };

export default function OwnerUrgentActions({ jobs, invoices, estimates }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const today = new Date();

  const items = [];

  // 🔴 Overdue invoices
  (invoices || []).filter(inv => {
    if (inv.status === "Paid") return false;
    if (!inv.due_date) return false;
    return differenceInDays(today, parseISO(inv.due_date)) > 0;
  }).forEach(inv => {
    const days = differenceInDays(today, parseISO(inv.due_date));
    items.push({
      priority: "red",
      icon: AlertCircle,
      text: `${inv.invoice_number || "Invoice"} for ${inv.customer_name || "customer"} is ${days} day${days !== 1 ? "s" : ""} overdue — $${(inv.balance_due || inv.total || 0).toLocaleString()}`,
      actionLabel: "Send Reminder",
      onAction: () => navigate(`/jobs/${inv.job_id}`),
    });
  });

  // 🟠 Aging estimates (7+ days, not approved)
  (estimates || []).filter(e => {
    if (e.status !== "Sent") return false;
    const d = e.created_date ? parseISO(e.created_date) : null;
    return d && differenceInDays(today, d) >= 7;
  }).forEach(e => {
    const job = (jobs || []).find(j => j.id === e.job_id);
    const days = differenceInDays(today, parseISO(e.created_date));
    items.push({
      priority: "orange",
      icon: Clock,
      text: `${job?.job_name || "Estimate"} has been waiting ${days} days for approval${e.total ? ` — $${e.total.toLocaleString()}` : ""}`,
      actionLabel: "Send Follow-Up",
      onAction: () => navigate(`/jobs/${e.job_id}`),
    });
  });

  // 🟠 Install complete, no final invoice
  (jobs || []).filter(j =>
    j.status === "Install Complete" &&
    !(invoices || []).some(inv => inv.job_id === j.id && inv.invoice_type === "Final")
  ).forEach(j => {
    items.push({
      priority: "orange",
      icon: FileText,
      text: `${j.job_name} install is complete — final invoice not yet sent`,
      actionLabel: "Create Invoice",
      onAction: () => navigate(`/jobs/${j.id}`),
    });
  });

  // 🟡 In Fab jobs with no scheduled install date
  const fabNoDate = (jobs || []).filter(j =>
    ["In Fabrication", "Fab Queue"].includes(j.stage) && !j.expected_install_date
  );
  if (fabNoDate.length > 0) {
    items.push({
      priority: "yellow",
      icon: Wrench,
      text: `${fabNoDate.length} job${fabNoDate.length !== 1 ? "s are" : " is"} In Fabrication with no scheduled install date`,
      actionLabel: "View Jobs",
      onAction: () => navigate("/jobs"),
    });
  }

  // 🟡 Deposit received but not moved to Fab
  (jobs || []).filter(j =>
    j.stage === "Deposit Received" && j.pipeline_board === "Sales"
  ).forEach(j => {
    items.push({
      priority: "yellow",
      icon: Wrench,
      text: `Deposit received on ${j.job_number || j.job_name} — job not moved to In Fabrication`,
      actionLabel: "View Job",
      onAction: () => navigate(`/jobs/${j.id}`),
    });
  });

  items.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority]);

  const displayed = expanded ? items : items.slice(0, 7);
  const hasMore = items.length > 7;

  const bgMap = { red: "bg-red-50 border-red-200", orange: "bg-orange-50 border-orange-200", yellow: "bg-yellow-50 border-yellow-200" };
  const iconMap = { red: "text-red-500", orange: "text-orange-500", yellow: "text-yellow-500" };
  const dotMap = { red: "bg-red-500", orange: "bg-orange-500", yellow: "bg-yellow-400" };

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <p className="text-2xl mb-1">✅</p>
        All clear — nothing needs your attention right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayed.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${bgMap[item.priority]}`}>
            <div className="flex items-start gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotMap[item.priority]}`} />
              <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 shrink-0 whitespace-nowrap"
              onClick={item.onAction}
            >
              {item.actionLabel}
            </Button>
          </div>
        );
      })}
      {hasMore && (
        <button
          onClick={() => setExpanded(p => !p)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> View all {items.length} items</>}
        </button>
      )}
    </div>
  );
}