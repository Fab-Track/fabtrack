import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const OUTCOMES = [
  "Unqualified Lead",
  "Qualified — Not Interested",
  "Qualified — Lost",
  "Testing",
];

export default function CloseLeadModal({ open, onClose, job }) {
  const [outcome, setOutcome] = useState("");
  const [reason, setReason] = useState("");
  const [lostTo, setLostTo] = useState("");
  const qc = useQueryClient();

  const closeMutation = useMutation({
    mutationFn: () => base44.entities.Job.update(job.id, {
      lead_outcome: outcome,
      lead_close_reason: reason || null,
      lead_lost_to: outcome === "Qualified — Lost" ? (lostTo || null) : null,
      lead_closed_at: new Date().toISOString(),
      is_lead_closed: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      handleClose();
    },
  });

  function handleClose() {
    setOutcome("");
    setReason("");
    setLostTo("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Close Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            <strong>{job?.job_name}</strong> — record why this lead is closing. It will be removed from the active board and archived.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs">Lead Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome…" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {outcome === "Qualified — Lost" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Lost To</Label>
              <Input
                value={lostTo}
                onChange={e => setLostTo(e.target.value)}
                placeholder="Competitor name, alternative, reason…"
                className="text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Reason / Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why did this lead close this way?"
              className="text-sm h-20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={!outcome || closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              {closeMutation.isPending ? "Closing…" : "Close Lead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}