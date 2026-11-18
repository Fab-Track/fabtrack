import React from "react";
import { Paintbrush } from "lucide-react";

/**
 * Compact view of the Job Details panel (products, powder coat, customer
 * approval) shown on the front of pipeline cards.
 */
export default function JobCardDetails({ job, showPowderCoat = true }) {
  const products = job.product_instances?.length
    ? [...new Set(job.product_instances.map(p => p.product_type).filter(Boolean))]
    : [...new Set((job.job_level_data?.product_details || []).map(p => p.product).filter(Boolean))];

  const approval = job.customer_approval_status === "approved"
    ? "approved"
    : job.customer_approval_status === "rejected"
      ? "rejected"
      : null;

  if (!products.length && !(showPowderCoat && job.powder_coat_color) && !approval) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {products.slice(0, 3).map(product => (
        <span key={product} className="text-[10px] px-1.5 py-0 rounded border bg-muted/60 text-muted-foreground border-border font-medium">
          {product}
        </span>
      ))}
      {products.length > 3 && (
        <span className="text-[10px] px-1.5 py-0 rounded border bg-muted/60 text-muted-foreground border-border font-medium">
          +{products.length - 3}
        </span>
      )}
      {showPowderCoat && job.powder_coat_color && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Paintbrush className="w-3 h-3" />
          {job.powder_coat_color}
        </span>
      )}
      {approval && (
        <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold ${
          approval === "approved" ? "bg-primary text-primary-foreground" : "bg-red-100 text-red-800"
        }`}>
          {approval === "approved" ? "Approved" : "Not approved"}
        </span>
      )}
    </div>
  );
}