import React from "react";

const CONFIG = {
  "not_invoiced": { label: "Not Invoiced", className: "bg-muted text-muted-foreground" },
  "waiting_for_draw": { label: "Waiting for Draw", className: "bg-indigo-100 text-indigo-800" },
  "sent_pending_draw": { label: "Sent - Pending Draw", className: "bg-blue-100 text-blue-800" },
  "50_percent":   { label: "50% Paid", className: "bg-amber-100 text-amber-800" },
  "100_percent":  { label: "100% Paid", className: "bg-emerald-100 text-emerald-800" },
  "partial":      { label: "Partial / Deposit", className: "bg-amber-100 text-amber-800" },
  "paid_in_full": { label: "Paid in Full", className: "bg-emerald-100 text-emerald-800" },
};

export default function PaymentStatusBadge({ status, className = "" }) {
  const cfg = CONFIG[status] || CONFIG.not_invoiced;
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold whitespace-nowrap ${cfg.className} ${className}`}>
      {cfg.label}
    </span>
  );
}