import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function DeleteJobModal({ open, onClose, job, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const qc = useQueryClient();

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
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{job?.job_name}</strong>? This will permanently delete the job and all associated data including documents, estimates, invoices, and communication history. This cannot be undone.
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
      </DialogContent>
    </Dialog>
  );
}