import React from "react";

// Company name (secondary/smaller, only when present) + customer name + customer type
export default function JobCardCustomerInfo({ customerName, customer }) {
  return (
    <div className="mb-2">
      {customer?.company && (
        <p className="text-[10px] text-muted-foreground/70 leading-tight truncate">{customer.company}</p>
      )}
      <p className="text-xs text-muted-foreground leading-tight truncate">
        {customerName || "—"}
        {customer?.type && <span className="text-muted-foreground/60"> · {customer.type}</span>}
      </p>
    </div>
  );
}