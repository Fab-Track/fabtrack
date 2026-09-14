import React from "react";
import { Badge } from "@/components/ui/badge";
import LineApprovalButtons from "@/components/jobs/LineApprovalButtons";
import { getProductScopeFields } from "@/lib/productDetailsLabels";

/**
 * Read-only scope block for a single product_details entry.
 * Lists only filled fields, plus per-product manager approval controls.
 *
 * Props: entry, index, canApprove, onSetApproval(status | null)
 */
export default function ProductScopeBlock({ entry, index, canApprove, onSetApproval }) {
  const fields = getProductScopeFields(entry);
  const productLabel = entry.product || `Product ${index + 1}`;
  const appr = entry.mgr_approval;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{productLabel}</span>
          {appr?.status === "approved" && (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-transparent">Approved</Badge>
          )}
          {appr?.status === "denied" && (
            <Badge className="text-[10px] bg-red-100 text-red-700 border-transparent">Flagged</Badge>
          )}
        </div>
        <LineApprovalButtons line={entry} canApprove={canApprove} onSet={onSetApproval} />
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No details entered for this product yet.</p>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-0.5 min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">{f.label}</dt>
              <dd className="text-sm break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}