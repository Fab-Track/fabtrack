import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { canApproveScope } from "@/lib/scopeApprovalHelpers";
import { toast } from "sonner";

/** Manager sign-off box shown in the Scope header — records name + timestamp. */
export default function ScopeApprovalBox({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canApprove = canApproveScope(user);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const approval = job.scope_approval;

  const mutation = useMutation({
    mutationFn: (scope_approval) => base44.entities.Job.update(job.id, { scope_approval }),
    onSuccess: (_, val) => {
      qc.invalidateQueries();
      toast.success(val ? "Scope signed off" : "Sign-off removed");
      setConfirmOpen(false);
    },
    onError: (err) => toast.error(err?.message || "Failed to update sign-off"),
  });

  if (approval?.approved_at) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <div className="leading-tight">
          <p className="text-xs font-semibold text-emerald-800">Manager Approved</p>
          <p className="text-[10px] text-emerald-700">
            {approval.approved_by_name} · {format(parseISO(approval.approved_at), "MMM d, yyyy h:mm a")}
          </p>
        </div>
        {canApprove && (
          <button
            className="p-0.5 rounded hover:bg-emerald-100 text-emerald-700"
            title="Remove sign-off"
            onClick={() => mutation.mutate(null)}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (!canApprove) {
    return <span className="text-xs text-muted-foreground italic">Awaiting manager sign-off</span>;
  }

  return (
    <>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setConfirmOpen(true)}>
        <ShieldCheck className="w-3.5 h-3.5" /> Manager Sign-Off
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign off on this job's scope?</AlertDialogTitle>
            <AlertDialogDescription>
              Your name and a timestamp will be recorded as the manager approval for this scope:
              <span className="block font-medium text-foreground mt-2">
                {user?.full_name} — {format(new Date(), "MMM d, yyyy h:mm a")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({
                approved_at: new Date().toISOString(),
                approved_by_id: user?.id || "",
                approved_by_name: user?.full_name || "",
              })}
            >
              {mutation.isPending ? "Signing…" : "Sign Off"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}