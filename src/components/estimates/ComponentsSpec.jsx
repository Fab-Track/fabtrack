/**
 * ComponentsSpec — read-only display of a line item's `components` array
 * (e.g. railing material breakdown). Used on customer-facing estimate/invoice
 * summaries and the fabricator Scope view. Never shows pricing.
 */
import React from "react";

export default function ComponentsSpec({ components, className = "" }) {
  if (!components || components.length === 0) return null;
  return (
    <p className={`text-xs text-muted-foreground mt-0.5 ${className}`}>
      {components.map((c, i) => (
        <span key={i}>
          {i > 0 && " · "}
          <span className="font-medium text-foreground/70">{c.component_type}:</span> {c.name}
        </span>
      ))}
    </p>
  );
}