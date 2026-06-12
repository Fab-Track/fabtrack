import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Generic stage-move confirmation dialog.
 * Props:
 *   open, onClose
 *   title – dialog heading
 *   message – descriptive message
 *   fromStage, toStage, toBoard
 *   onConfirm(note) – called with optional note string
 *   confirmLabel – button text (default "Confirm")
 *   requireNote – if true, note is required
 */
export default function StageTransitionDialog({
  open, onClose, title, message, fromStage, toStage, toBoard,
  onConfirm, confirmLabel = "Confirm", requireNote = false, isPending = false,
  repSelector = null, // { reps: [{id, name}], selectedRepId, onSelect }
}) {
  const [note, setNote] = useState("");

  function handleConfirm() {
    onConfirm(note);
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {(fromStage || toStage) && (
            <div className="flex items-center gap-2 text-sm font-medium bg-muted/40 rounded-lg px-3 py-2">
              {fromStage && <span className="text-muted-foreground">{fromStage}</span>}
              {fromStage && toStage && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              {toStage && <span>{toStage}</span>}
              {toBoard && <span className="ml-auto text-xs text-muted-foreground">→ {toBoard} Board</span>}
            </div>
          )}
          <div>
            <Label className="text-xs">{requireNote ? "Note (required)" : "Add a note (optional)"}</Label>
            <Textarea
              rows={2}
              className="mt-1 text-sm"
              placeholder="e.g., Picked up by XYZ Coatings on Monday…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          {repSelector && repSelector.reps.length > 0 && (
            <div>
              <Label className="text-xs">Who gets sales credit?</Label>
              <Select value={repSelector.selectedRepId || ""} onValueChange={repSelector.onSelect}>
                <SelectTrigger className="mt-1 text-sm h-9">
                  <SelectValue placeholder="Select a rep…" />
                </SelectTrigger>
                <SelectContent>
                  {repSelector.reps.map(rep => (
                    <SelectItem key={rep.id} value={rep.id} className="text-sm">{rep.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={(requireNote && !note.trim()) || isPending}
              onClick={handleConfirm}
            >
              {isPending ? "Moving…" : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}