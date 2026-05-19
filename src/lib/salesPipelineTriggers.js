import { base44 } from "@/api/base44Client";
import { buildStageTransition } from "@/lib/pipelineHelpers";

// Stage ordering for "don't go back" guard
const SALES_ORDER = [
  "New Lead",
  "Estimate In Progress",
  "Estimate Sent",
  "Negotiation / In Review",
  "Awaiting Deposit",
  "Deposit Received / Sale Won",
];

function stageIndex(stage) {
  return SALES_ORDER.indexOf(stage ?? "New Lead");
}

function isBeforeOrAt(currentStage, targetStage) {
  return stageIndex(currentStage) <= stageIndex(targetStage);
}

/**
 * Moves a job to a new Sales stage if it hasn't already passed it,
 * appending a history entry with the trigger reason.
 * Returns the updated job payload or null if no move was needed.
 */
export async function autoMoveSalesStage(job, toStage, triggerNote, actorName) {
  if (!isBeforeOrAt(job.stage, toStage)) return null; // already past this stage
  if (job.stage === toStage) return null;              // already there

  const transition = buildStageTransition(job, "Sales", toStage, triggerNote);
  // Enrich the last history entry with actor name
  const history = [...transition.stage_history];
  history[history.length - 1] = { ...history[history.length - 1], triggered_by: actorName || "System" };
  const payload = { ...transition, stage_history: history };

  await base44.entities.Job.update(job.id, payload);
  return payload;
}