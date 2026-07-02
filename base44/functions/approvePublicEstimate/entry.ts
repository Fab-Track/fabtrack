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

function isBeforeOrAt(currentStage, targetStage) {
  return stageIndex(currentStage) <= stageIndex(targetStage);
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
  if (!isBeforeOrAt(job.stage, toStage)) return null; // already past this stage
  if (job.stage === toStage) return null;              // already there

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
    const { estimateId, customerName } = body;

    if (!estimateId || !customerName) {
      return Response.json({ error: 'estimateId and customerName are required' }, { status: 400 });
    }

    let estimate = null;
    try {
      estimate = await base44.asServiceRole.entities.Estimate.get(estimateId);
    } catch {
      estimate = null;
    }
    if (!estimate) {
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }

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