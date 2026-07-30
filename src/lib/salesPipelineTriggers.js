import { base44 } from "@/api/base44Client";
import {
  buildStageTransition,
  SALES_STAGES,
  SHOP_STAGES,
  BILLING_STAGES,
  getBoardForJob,
} from "@/lib/pipelineHelpers";

// Boards flow strictly forward: Sales → Shop → Billing. Cards never move
// backward automatically; the UI must ask for permission first.
const BOARD_ORDER = { Sales: 0, Shop: 1, Billing: 2 };
const boardRank = (board) => BOARD_ORDER[board] ?? 0;
function stageIndexInBoard(board, stage) {
  const arr =
    board === "Shop" ? SHOP_STAGES : board === "Billing" ? BILLING_STAGES : SALES_STAGES;
  return arr.indexOf(stage);
}

/**
 * Is moving `job` → (toBoard, toStage) a backward move in the Sales→Shop→Billing flow?
 * A move is backward when the target board is earlier than the current board,
 * or — within the same board — the target stage is earlier than the current stage.
 */
export function isBackwardMove(job, toBoard, toStage) {
  const fromBoard = job?.pipeline_board || getBoardForJob(job) || "Sales";
  const fromStage = job?.stage || "";
  const fb = boardRank(fromBoard);
  const tb = boardRank(toBoard);
  if (tb < fb) return true;
  if (tb > fb) return false;
  const fi = stageIndexInBoard(fromBoard, fromStage);
  const ti = stageIndexInBoard(toBoard, toStage);
  if (fi === -1 || ti === -1) return false; // unknown stage → treat as forward
  return ti < fi;
}

/**
 * Moves a job to a new Sales stage, unless that would be a backward move.
 *
 * Returns:
 *   { moved: true, payload }            — move performed
 *   { moved: false, backward: true, … } — move blocked (backward); caller should prompt
 *   { moved: false, reason: "already" } — job already at the target stage
 *
 * Pass { force: true } to perform a backward move after the user has confirmed.
 */
export async function autoMoveSalesStage(job, toStage, triggerNote, actorName, opts = {}) {
  const toBoard = "Sales";

  if (job?.pipeline_board === toBoard && job?.stage === toStage) {
    return { moved: false, reason: "already" };
  }

  if (!opts.force && isBackwardMove(job, toBoard, toStage)) {
    return {
      moved: false,
      backward: true,
      from: { board: job?.pipeline_board || "Sales", stage: job?.stage || "" },
      to: { board: toBoard, stage: toStage },
      job,
      toStage,
      triggerNote,
    };
  }

  const transition = buildStageTransition(job, toBoard, toStage, triggerNote);
  const history = [...transition.stage_history];
  history[history.length - 1] = {
    ...history[history.length - 1],
    triggered_by: actorName || "System",
  };
  const payload = { ...transition, stage_history: history };

  await base44.entities.Job.update(job.id, payload);
  return { moved: true, payload };
}