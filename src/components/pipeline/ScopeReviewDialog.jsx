import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { canApproveScope, setLineApproval } from "@/lib/scopeApprovalHelpers";
import LineApprovalButtons from "@/components/jobs/LineApprovalButtons";

/**
 * Popup shown when a job moves from "Drawing Needs Approval" to
 * "On Deck for Fabrication" — lists scope line items for a final review.
 */
export default function ScopeReviewDialog({ open, onClose, job, onConfirm, isPending }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canApprove = canApproveScope(user);
  const jobId = job?.id;

  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates", jobId],
    queryFn: () => base44.entities.Estimate.filter({ job_id: jobId }),
    enabled: open && !!jobId,
  });
  const { data: changeOrders = [] } = useQuery({
    queryKey: ["changeOrders", jobId],
    queryFn: () => base44.entities.ChangeOrder.filter({ job_id: jobId }),
    enabled: open && !!jobId,
  });

  const approvedEstimate = estimates.find(e => e.status === "Approved");
  const approvedCOs = changeOrders.filter(co => co.status === "Approved");
  const allLines = [
    ...(approvedEstimate?.line_items || []).map((l, idx) => ({
      ...l, _src: { type: "Estimate", record: approvedEstimate, idx },
    })),
    ...approvedCOs.flatMap(co => (co.line_items || []).map((l, idx) => ({
      ...l,
      _co_label: `CO #${co.id?.slice(-6).toUpperCase()}`,
      _src: { type: "ChangeOrder", record: co, idx },
    }))),
  ];

  const approveMutation = useMutation({
    mutationFn: ({ src, status }) =>
      setLineApproval({ entityType: src.type, record: src.record, lineIdx: src.idx, status, user }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates", jobId] });
      qc.invalidateQueries({ queryKey: ["changeOrders", jobId] });
    },
  });

  const approvedCount = allLines.filter(l => l.mgr_approval?.status === "approved").length;
  const deniedCount = allLines.filter(l => l.mgr_approval?.status === "denied").length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            Review Scope Before Fabrication
          </DialogTitle>
        </DialogHeader>
        <p className="px-6 pt-2 pb-1 text-sm text-muted-foreground">
          "{job?.job_name}" is moving to <span className="font-medium text-foreground">On Deck for Fabrication</span>.
          Review each line item so nothing gets missed.
        </p>
        <div className="max-h-[50vh] overflow-y-auto border-t divide-y">
          {allLines.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No approved scope line items found for this job.
            </p>
          )}
          {allLines.map((line, i) => (
            <div key={i} className="px-6 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {line.service_name || line.description || "—"}
                  {line._co_label && (
                    <Badge className="ml-2 text-[10px] bg-amber-100 text-amber-700 border-transparent">{line._co_label}</Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {[
                    line.quantity != null ? `Qty ${line.quantity}` : null,
                    line.color,
                    line.install_location && line.install_location !== "N/A" ? line.install_location : null,
                  ].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <LineApprovalButtons
                line={line}
                canApprove={canApprove}
                onSet={(status) => approveMutation.mutate({ src: line._src, status })}
              />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{approvedCount}/{allLines.length}</span> approved
            {deniedCount > 0 && <span className="text-red-600 font-medium"> · {deniedCount} flagged</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="gap-1" disabled={isPending} onClick={onConfirm}>
              {isPending ? "Moving…" : (<>Move to Fabrication <ArrowRight className="w-3.5 h-3.5" /></>)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}