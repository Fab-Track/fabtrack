import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Copied verbatim from src/lib/pipelineHelpers.js (SALES_ORDER, stageIndex, isBeforeOrAt,
// the Sales-board branch of stageToStatus, and buildStageTransition) and from
// src/lib/salesPipelineTriggers.js (autoMoveSalesStage) so the public approval flow
// produces the exact same Job update / stage-history note as the authenticated flow.

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

// Boards flow strictly forward: Sales → Shop → Billing. A customer-signed
// estimate must never drag a job that's already in Shop or Billing back to a
// Sales stage. (There's no one to prompt on a public link, so we simply skip.)
const SHOP_STAGES = [
  "New Jobs Landed — Needs Approval",
  "On Deck for Measure",
  "Ready for Measure",
  "Needs Drawing",
  "Drawing Needs Approval",
  "On Deck for Fabrication",
  "Fabricate",
  "Fabrication Complete — Needs Powder Coat",
  "At Powder Coat",
  "Ready for Install",
  "Install in Progress / Not Complete",
  "Install Complete",
];
const BILLING_STAGES = [
  "Needs 2nd Half Invoice Created",
  "2nd Half Invoice Sent",
  "10 Days Overdue",
  "15 Days Overdue",
  "20 Days Overdue",
  "30 Days Overdue",
  "30+ Days Overdue",
  "Paid / Closed",
];
const BOARD_ORDER = { Sales: 0, Shop: 1, Billing: 2 };
const boardRank = (board) => BOARD_ORDER[board] ?? 0;
function stageIndexInBoard(board, stage) {
  const arr =
    board === "Shop" ? SHOP_STAGES : board === "Billing" ? BILLING_STAGES : SALES_ORDER;
  return arr.indexOf(stage);
}
function isBackwardMove(job, toBoard, toStage) {
  const fromBoard = job?.pipeline_board || "Sales";
  const fromStage = job?.stage || "";
  const fb = boardRank(fromBoard);
  const tb = boardRank(toBoard);
  if (tb < fb) return true;
  if (tb > fb) return false;
  const fi = stageIndexInBoard(fromBoard, fromStage);
  const ti = stageIndexInBoard(toBoard, toStage);
  if (fi === -1 || ti === -1) return false;
  return ti < fi;
}

function stageToStatus(toStage) {
  const salesMap = {
    "New Lead": "Estimate",
    "Estimate in Progress": "Estimate",
    "Estimate In Progress": "Estimate",
    "Estimate Sent": "Estimate",
    "Negotiation / In Review": "Estimate",
    "Awaiting Deposit": "Approved",
    "Deposit Received / Sale Won": "Approved",
  };
  return salesMap[toStage] || "Estimate";
}

function buildStageTransition(job, toBoard, toStage, note = "") {
  const now = new Date().toISOString();
  const historyEntry = {
    from_board: job.pipeline_board || "Sales",
    to_board: toBoard,
    from_stage: job.stage || "",
    to_stage: toStage,
    timestamp: now,
    note,
  };
  return {
    pipeline_board: toBoard,
    stage: toStage,
    stage_entered_at: now,
    stage_history: [...(job.stage_history || []), historyEntry],
    last_activity_date: now,
    status: stageToStatus(toStage),
  };
}

async function autoMoveSalesStage(base44, job, toStage, triggerNote, actorName) {
  if (job?.pipeline_board === "Sales" && job?.stage === toStage) return null; // already there
  if (isBackwardMove(job, "Sales", toStage)) return null; // never move backward silently

  const transition = buildStageTransition(job, "Sales", toStage, triggerNote);
  const history = [...transition.stage_history];
  history[history.length - 1] = { ...history[history.length - 1], triggered_by: actorName || "System" };
  const payload = { ...transition, stage_history: history };

  await base44.asServiceRole.entities.Job.update(job.id, payload);
  return payload;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, customerName } = body;

    if (!token || !customerName) {
      return Response.json({ error: 'token and customerName are required' }, { status: 400 });
    }

    let estimate = null;
    try {
      const matches = await base44.asServiceRole.entities.Estimate.filter({ share_token: token });
      estimate = matches[0] || null;
    } catch {
      estimate = null;
    }
    if (!estimate) {
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }
    const estimateId = estimate.id;

    if (estimate.status === 'Approved') {
      return Response.json({ error: 'This estimate has already been approved' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const estimateUpdate = {
      status: 'Approved',
      customer_signature: customerName,
      customer_printed_name: customerName,
      approved_date: now.split('T')[0],
      approved_at: now,
      approval_method: 'Customer Signed',
    };
    await base44.asServiceRole.entities.Estimate.update(estimateId, estimateUpdate);

    if (estimate.job_id) {
      const job = await base44.asServiceRole.entities.Job.get(estimate.job_id);
      if (job) {
        const jobWithTotal = { ...job, estimate_total: estimate.total };
        await base44.asServiceRole.entities.Job.update(job.id, {
          estimate_total: estimate.total,
          customer_approval_status: 'approved',
        });

        await autoMoveSalesStage(
          base44,
          jobWithTotal,
          'Awaiting Deposit',
          `Estimate approved by ${customerName} via customer link`,
          customerName
        );
      }
    }

    return Response.json({ success: true, ...estimateUpdate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});