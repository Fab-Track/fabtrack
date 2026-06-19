import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Archive, Ban, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function DeleteJobModal({ open, onClose, job, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [hasFinancialRecords, setHasFinancialRecords] = useState(null); // null=checking, true/false
  const qc = useQueryClient();

  // Check for financial records (estimates, invoices) linked to this job
  useEffect(() => {
    if (!open || !job?.id) return;
    setHasFinancialRecords(null);
    setConfirmText("");
    (async () => {
      try {
        const [estimates, invoices] = await Promise.all([
          base44.entities.Estimate.filter({ job_id: job.id }),
          base44.entities.Invoice.filter({ job_id: job.id }),
        ]);
        setHasFinancialRecords(estimates.length > 0 || invoices.length > 0);
      } catch {
        // If queries fail (e.g., entities don't exist), err on the safe side
        setHasFinancialRecords(true);
      }
    })();
  }, [open, job?.id]);

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Job.delete(job.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      onDeleted?.();
      onClose();
    },
  });

  const matches = confirmText === job?.job_name;

  function handleClose() {
    setConfirmText("");
    setHasFinancialRecords(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete Job
          </DialogTitle>
        </DialogHeader>

        {hasFinancialRecords === null ? (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking financial records…
          </div>
        ) : hasFinancialRecords ? (
          /* Blocked — has financial records */
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Ban className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Cannot delete this job</p>
                <p className="text-xs text-amber-700 mt-1">
                  This job has estimates, invoices, or payment records attached. Jobs with financial history cannot be permanently deleted to preserve your financial records.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Archive className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Archive instead</p>
                <p className="text-xs text-blue-700 mt-1">
                  Archiving removes the job from your active board while preserving all data — including estimates, invoices, attachments, and full history. You can restore it later if needed.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          /* Clean — allow hard delete */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently deletes <strong className="text-foreground">{job?.job_name}</strong> and all associated data including documents and communication history. <strong className="text-destructive">This cannot be undone.</strong>
            </p>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Type the job name to confirm:</p>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={job?.job_name}
                className="text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!matches || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Job"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}