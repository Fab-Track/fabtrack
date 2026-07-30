import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Confirmation shown when an action would push a job backward in the
 * Sales → Shop → Billing flow. The job is NOT moved until the user confirms.
 */
export default function BackwardMoveConfirm({
  open,
  jobName,
  fromBoard,
  fromStage,
  toStage,
  onConfirm,
  onCancel,
  isConfirming = false,
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o && !isConfirming) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move “{jobName}” back to Sales → {toStage}?</AlertDialogTitle>
          <AlertDialogDescription>
            This job is already in the {fromBoard} board{fromStage ? ` (“{fromStage}”)` : ""}. The
            action you just took normally sends it back to the Sales board at “{toStage}”. Cards
            don’t move backward automatically — do you want to move it back now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isConfirming}>
            Keep where it is
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? "Moving…" : "Yes, move back"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}