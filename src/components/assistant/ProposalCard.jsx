import React, { useState } from "react";
import { ArrowRight, Check, Loader2, X, FileText, ClipboardPaste, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export default function ProposalCard({ proposal, onApply, onDismiss, busy }) {
  const [expanded, setExpanded] = useState(false);
  const changes = proposal.changes || [];
  const isEstimate = proposal.proposal_type === "estimate";
  const isNote = proposal.proposal_type === "job_note";
  const shown = expanded ? changes : changes.slice(0, 6);
  const status = proposal.status || "pending";

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/[0.04] overflow-hidden my-2">
      <div className="flex items-start gap-2 px-3.5 pt-3 pb-2">
        {isEstimate
          ? <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          : isNote
            ? <StickyNote className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            : <ClipboardPaste className="w-4 h-4 text-accent shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {proposal.title || (isEstimate ? "Proposed estimate" : isNote ? "Proposed job note" : "Proposed job changes")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {proposal.job_number ? `${proposal.job_number} · ` : ""}
            {status === "applied"
              ? "Saved"
              : status === "dismissed"
                ? "Dismissed"
                : isEstimate || isNote
                  ? "Review before saving"
                  : `${changes.length} field${changes.length === 1 ? "" : "s"} to update`}
          </p>
        </div>
      </div>

      {isNote && (
        <div className="px-3.5 pb-2">
          <p className="text-xs leading-relaxed whitespace-pre-wrap border-l-2 border-accent/40 pl-2.5">
            {proposal.payload?.note_text}
          </p>
          {proposal.payload?.is_todo && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Added as a to-do{proposal.payload?.due_date ? ` · due ${proposal.payload.due_date}` : ""}
            </p>
          )}
        </div>
      )}

      {!isEstimate && !isNote && (
        <div className="px-3.5 pb-2 space-y-1">
          {shown.map((c, i) => (
            <div key={i} className="text-xs flex items-start gap-1.5">
              <span className="text-muted-foreground shrink-0 w-28 truncate">{c.label || c.field}</span>
              <span className="text-muted-foreground/60 line-through truncate max-w-[28%]">{fmt(c.from)}</span>
              <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground/50" />
              <span className="font-medium break-words min-w-0">{fmt(c.to)}</span>
            </div>
          ))}
          {changes.length > 6 && (
            <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium text-accent hover:underline">
              {expanded ? "Show less" : `Show all ${changes.length} changes`}
            </button>
          )}
        </div>
      )}

      {isEstimate && Array.isArray(proposal.payload?.line_items) && (
        <div className="px-3.5 pb-2 space-y-1">
          {proposal.payload.line_items.slice(0, expanded ? 50 : 5).map((li, i) => (
            <div key={i} className="text-xs flex items-baseline justify-between gap-2">
              <span className="truncate">{li.description || li.service_name || "Line item"}</span>
              <span className="font-medium tabular-nums shrink-0">
                {Number(li.quantity || 0)} {li.unit || ""} × ${Number(li.unit_cost || 0).toLocaleString()}
              </span>
            </div>
          ))}
          {proposal.payload.line_items.length > 5 && (
            <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium text-accent hover:underline">
              {expanded ? "Show less" : `Show all ${proposal.payload.line_items.length} line items`}
            </button>
          )}
          <div className="flex items-baseline justify-between pt-1.5 mt-1 border-t border-accent/20">
            <span className="text-xs font-medium">Total</span>
            <span className="text-sm font-bold tabular-nums">
              ${Number(proposal.payload.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {proposal.notes && (
        <p className="px-3.5 pb-2 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{proposal.notes}</p>
      )}

      <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-accent/20 bg-accent/[0.03]">
        {status === "pending" ? (
          <>
            <Button size="sm" className="h-8" onClick={() => onApply(proposal)} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isEstimate ? "Create estimate" : isNote ? "Add note" : "Save changes"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => onDismiss(proposal)} disabled={busy}>
              <X className="w-3.5 h-3.5" />
              Dismiss
            </Button>
          </>
        ) : (
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
            {status === "applied" ? <Check className="w-3.5 h-3.5 text-success" /> : <X className="w-3.5 h-3.5" />}
            {status === "applied" ? "Saved to this job" : "Dismissed — nothing was changed"}
          </span>
        )}
      </div>
    </div>
  );
}