import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X, Flag } from "lucide-react";
import { format, parseISO } from "date-fns";

/**
 * Per-line-item manager review controls.
 * Props: line (with optional mgr_approval), canApprove, onSet(status | null)
 */
export default function LineApprovalButtons({ line, canApprove, onSet }) {
  const appr = line.mgr_approval;
  const stamp = appr?.at ? format(parseISO(appr.at), "M/d/yy h:mm a") : "";
  const who = appr?.by_name ? appr.by_name.split(" ")[0] : "";

  if (appr?.status === "approved" || appr?.status === "denied") {
    const approved = appr.status === "approved";
    return (
      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
        <Badge
          className={`text-[10px] whitespace-nowrap border-transparent ${approved ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}
          title={`${approved ? "Approved" : "Flagged"} by ${appr.by_name || "—"}${stamp ? ` on ${stamp}` : ""}`}
        >
          {approved ? <Check className="w-3 h-3 mr-1" /> : <Flag className="w-3 h-3 mr-1" />}
          {who || (approved ? "Approved" : "Flagged")}{stamp ? ` · ${stamp}` : ""}
        </Badge>
        {canApprove && (
          <button
            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
            title="Clear review"
            onClick={() => onSet(null)}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (!canApprove) {
    return <span className="text-xs text-muted-foreground">Pending review</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
      <button
        className="h-6 px-2 rounded-md border text-xs font-medium text-emerald-700 border-emerald-200 hover:bg-emerald-50 inline-flex items-center gap-1"
        onClick={() => onSet("approved")}
      >
        <Check className="w-3 h-3" /> Approve
      </button>
      <button
        className="h-6 px-2 rounded-md border text-xs font-medium text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-1"
        title="Flag this line item for attention"
        onClick={() => onSet("denied")}
      >
        <Flag className="w-3 h-3" /> Deny
      </button>
    </div>
  );
}