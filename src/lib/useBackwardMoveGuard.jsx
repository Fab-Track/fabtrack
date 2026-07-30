import { useState, useCallback } from "react";
import { autoMoveSalesStage, isBackwardMove } from "./salesPipelineTriggers";
import BackwardMoveConfirm from "@/components/pipeline/BackwardMoveConfirm";

/**
 * Guards Sales-flow stage moves so a job never moves backward in the
 * Sales → Shop → Billing flow without explicit user confirmation.
 *
 * Usage:
 *   const guard = useBackwardMoveGuard(actorName);
 *   const res = await guard.requestMove(job, "Awaiting Deposit", "Estimate approved");
 *   // res.moved === true  → moved forward (or forced back after confirm)
 *   // res.declined === true → user declined the backward move; job unchanged
 *   // res.reason === "already" → already at target
 *   ... render {guard.dialog} somewhere in the component JSX.
 */
export function useBackwardMoveGuard(actorName) {
  const [pending, setPending] = useState(null); // { job, toStage, note, resolve }
  const [confirming, setConfirming] = useState(false);

  const requestMove = useCallback(
    (job, toStage, note) =>
      new Promise((resolve) => {
        if (job?.pipeline_board === "Sales" && job?.stage === toStage) {
          resolve({ moved: false, reason: "already" });
          return;
        }
        if (!isBackwardMove(job, "Sales", toStage)) {
          autoMoveSalesStage(job, toStage, note, actorName).then(resolve).catch((err) => resolve({ moved: false, error: err }));
          return;
        }
        // Backward move — ask first, don't touch the job yet.
        setPending({ job, toStage, note, resolve });
      }),
    [actorName]
  );

  const confirm = useCallback(async () => {
    if (!pending) return;
    const { job, toStage, note, resolve } = pending;
    setConfirming(true);
    try {
      const res = await autoMoveSalesStage(job, toStage, note, actorName, { force: true });
      resolve(res);
    } catch (err) {
      resolve({ moved: false, error: err });
    } finally {
      setConfirming(false);
      setPending(null);
    }
  }, [pending, actorName]);

  const cancel = useCallback(() => {
    if (!pending) return;
    const { resolve } = pending;
    setPending(null);
    resolve({ moved: false, declined: true });
  }, [pending]);

  const dialog = pending ? (
    <BackwardMoveConfirm
      open
      jobName={pending.job?.job_name || pending.job?.job_number || "this job"}
      fromBoard={pending.job?.pipeline_board || "Sales"}
      fromStage={pending.job?.stage || ""}
      toStage={pending.toStage}
      isConfirming={confirming}
      onConfirm={confirm}
      onCancel={cancel}
    />
  ) : null;

  return { requestMove, dialog };
}