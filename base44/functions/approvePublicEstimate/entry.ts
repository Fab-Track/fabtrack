import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { sendOrgEmailViaResend } from '../../shared/email.js';

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

// Resolves the job's assigned estimator + sales rep and the org's owner/admin users,
// then fires an in-app bell Notification + an email alert to each when an estimate
// is signed via the public customer link. Failures are swallowed so the approval
// itself never breaks.
async function notifyEstimateSigned(base44, job, estimate, customerName) {
  const orgId = estimate.organization_id;
  if (!orgId || !job) return;

  // Build a deduplicated recipient list (user_id → { id, email, full_name })
  const recipientMap = new Map();

  const addUserById = async (userId) => {
    if (!userId) return;
    try {
      const u = await base44.asServiceRole.entities.User.get(userId);
      if (u?.email) recipientMap.set(u.id, { id: u.id, email: u.email, full_name: u.full_name });
    } catch { /* non-fatal */ }
  };

  await addUserById(job.assigned_estimator);
  await addUserById(job.assigned_rep_id);

  // Org owners + admins
  try {
    const orgUsers = await base44.asServiceRole.entities.User.filter(
      { organization_id: orgId }, '-created_date', 200
    );
    for (const u of orgUsers || []) {
      if (u.account_status && u.account_status !== 'active') continue;
      const roles = u.roles || (u.role ? [u.role] : []);
      if (!roles.includes('owner') && !roles.includes('admin')) continue;
      if (u.email) recipientMap.set(u.id, { id: u.id, email: u.email, full_name: u.full_name });
    }
  } catch { /* non-fatal */ }

  if (recipientMap.size === 0) return;

  // Fetch org name for the email "from" line
  let orgName = 'FabTrack';
  try {
    const org = await base44.asServiceRole.entities.Organization.get(orgId);
    if (org?.name) orgName = org.name;
  } catch { /* non-fatal */ }

  const jobLabel = job?.job_name || estimate.job_number || 'a job';
  const notifTitle = 'Estimate Signed ✍️';
  const notifBody = `${customerName} signed the estimate for ${jobLabel}.`;
  const notifLink = job?.id ? `/jobs/${job.id}` : null;

  for (const recipient of recipientMap.values()) {
    // 1) In-app bell notification
    try {
      await base44.asServiceRole.entities.Notification.create({
        organization_id: orgId,
        title: notifTitle,
        body: notifBody,
        type: 'info',
        link: notifLink,
        is_read: false,
        target_roles: [],
        assignee_id: recipient.id,
      });
    } catch { /* non-fatal */ }

    // 2) Email alert (via org's Resend config)
    try {
      const html = `<p>Hi ${recipient.full_name || 'there'},</p>
<p><strong>${customerName}</strong> just signed the estimate for <strong>${jobLabel}</strong>.</p>
<p>They've approved the scope and contract language. You can now send the invoice.</p>
${job?.id ? `<p><a href="https://fab-track.base44.app/jobs/${job.id}">View the job →</a></p>` : ''}
<p style="color:#888;font-size:12px;">This is an automated message from ${orgName}.</p>`;
      await sendOrgEmailViaResend(base44, orgId, {
        to: recipient.email,
        subject: `Estimate Signed — ${jobLabel}`,
        html,
      });
    } catch { /* non-fatal */ }
  }
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

        // ── Notify assigned estimator/rep + org owners/admins ──
        await notifyEstimateSigned(base44, job, estimate, customerName);
      }
    }

    return Response.json({ success: true, ...estimateUpdate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});