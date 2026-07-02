import React from "react";

const CONFIG = {
  not_invoiced: { label: "Not Invoiced", className: "bg-muted text-muted-foreground" },
  partial:      { label: "Partial / Deposit", className: "bg-amber-100 text-amber-800" },
  paid_in_full: { label: "Paid in Full", className: "bg-emerald-100 text-emerald-800" },
};

export default function PaymentStatusBadge({ status, className = "" }) {
  const cfg = CONFIG[status] || CONFIG.not_invoiced;
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold whitespace-nowrap ${cfg.className} ${className}`}>
      {cfg.label}
    </span>
  );
}