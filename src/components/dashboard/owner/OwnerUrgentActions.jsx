import React, { useState, useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { AlertCircle, Clock, FileText, Wrench, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PRIORITY = { red: 0, orange: 1, yellow: 2 };
const STORAGE_KEY = "fabtrack_dismissed_urgent_actions";

function loadDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); }
}
function saveDismissed(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch {}
}

export default function OwnerUrgentActions({ jobs, invoices, estimates }) {
  const [expanded, setExpanded] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [dismissed, setDismissed] = useState(loadDismissed);
  const navigate = useNavigate();
  const today = new Date();

  const allItems = useMemo(() => {
    const items = [];

    // 🔴 Overdue invoices
    (invoices || []).filter(inv => {
      if (inv.status === "Paid") return false;
      if (!inv.due_date) return false;
      return differenceInDays(today, parseISO(inv.due_date)) > 0;
    }).forEach(inv => {
      const days = differenceInDays(today, parseISO(inv.due_date));
      items.push({
        key: `overdue-inv-${inv.id}`,
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
        key: `aging-est-${e.id}`,
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
        key: `no-invoice-${j.id}`,
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
        key: `fab-no-date`,
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
        key: `deposit-not-fab-${j.id}`,
        priority: "yellow",
        icon: Wrench,
        text: `Deposit received on ${j.job_number || j.job_name} — job not moved to In Fabrication`,
        actionLabel: "View Job",
        onAction: () => navigate(`/jobs/${j.id}`),
      });
    });

    items.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority]);
    return items;
  }, [jobs, invoices, estimates]);

  const activeItems = allItems.filter(item => !dismissed.has(item.key));
  const dismissedItems = allItems.filter(item => dismissed.has(item.key));

  const handleDismiss = (key) => {
    const next = new Set(dismissed);
    next.add(key);
    setDismissed(next);
    saveDismissed(next);
  };

  const handleRestore = (key) => {
    const next = new Set(dismissed);
    next.delete(key);
    setDismissed(next);
    saveDismissed(next);
  };

  const displayed = expanded ? activeItems : activeItems.slice(0, 7);
  const hasMore = activeItems.length > 7;

  const bgMap = { red: "bg-red-50 border-red-200", orange: "bg-orange-50 border-orange-200", yellow: "bg-yellow-50 border-yellow-200" };
  const dotMap = { red: "bg-red-500", orange: "bg-orange-500", yellow: "bg-yellow-400" };

  if (activeItems.length === 0 && dismissedItems.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <p className="text-2xl mb-1">✅</p>
        All clear — nothing needs your attention right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeItems.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <p className="text-xl mb-1">✅</p>
          All items dismissed.
        </div>
      )}

      {displayed.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className={`flex items-center justify-between gap-2 p-3 rounded-lg border ${bgMap[item.priority]}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-2 h-2 rounded-full shrink-0 ${dotMap[item.priority]}`} />
              <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 whitespace-nowrap"
                onClick={item.onAction}
              >
                {item.actionLabel}
              </Button>
              <button
                onClick={() => handleDismiss(item.key)}
                title="Dismiss"
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={() => setExpanded(p => !p)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> View all {activeItems.length} items</>}
        </button>
      )}

      {dismissedItems.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowDismissed(p => !p)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDismissed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDismissed ? "Hide dismissed" : `Show ${dismissedItems.length} dismissed item${dismissedItems.length !== 1 ? "s" : ""}`}
          </button>

          {showDismissed && (
            <div className="mt-2 space-y-1.5">
              {dismissedItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground line-through leading-relaxed">{item.text}</p>
                  </div>
                  <button
                    onClick={() => handleRestore(item.key)}
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}