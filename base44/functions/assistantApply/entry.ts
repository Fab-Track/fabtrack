import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { buildPatch } from "../../shared/assistantChanges.js";
import { assistantAccess, forbidden } from "../../shared/assistantAccess.js";

// Applies or dismisses a PENDING assistant proposal. Only called from the app UI,
// never exposed to the agent — a person must confirm before anything is written.

const NUMBER_FLOOR = { 2026: 3 };

async function nextEstimateNumber(base44, orgId) {
  const year = new Date().getFullYear();
  const res = await base44.asServiceRole.entities.Estimate.aggregate({
    query: { organization_id: orgId },
    groupBy: "estimate_number",
    limit: 1000,
  });
  const used = new Set((res.rows || []).map((r) => r.estimate_number).filter(Boolean));
  let max = NUMBER_FLOOR[year] || 0;
  used.forEach((n) => {
    const m = /^EST-(\d{4})-(\d+)$/.exec(n);
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  });
  let seq = max + 1;
  let num = `EST-${year}-${String(seq).padStart(3, "0")}`;
  while (used.has(num)) num = `EST-${year}-${String(++seq).padStart(3, "0")}`;
  return num;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.organization_id) return Response.json({ error: "No organization on this account" }, { status: 403 });

    const access = assistantAccess(user);
    if (!access) return forbidden();

    const body = await req.json().catch(() => ({}));
    const proposalId = String(body.proposal_id || "").trim();
    const action = body.action || "apply";
    if (!proposalId) return Response.json({ error: "proposal_id is required" }, { status: 400 });

    const proposal = await base44.asServiceRole.entities.AssistantProposal.get(proposalId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!proposal) return Response.json({ error: "Proposal not found" }, { status: 404 });
    if (proposal.organization_id !== user.organization_id) {
      return Response.json({ error: "Proposal is not in your organization" }, { status: 403 });
    }
    if (proposal.status !== "pending") {
      return Response.json({ error: `This proposal is already ${proposal.status}` }, { status: 409 });
    }

    // Re-checked on every confirm: a proposal made earlier, or by someone else, still
    // needs this user's own role to allow the write.
    if (action !== "dismiss") {
      const canApply =
        proposal.proposal_type === "estimate"
          ? access.estimating
          : access.jobUpdates;
      if (!canApply) {
        return forbidden(
          proposal.proposal_type === "estimate"
            ? "Your role can't create estimates from an assistant proposal."
            : "Your role can't apply job changes from an assistant proposal.",
        );
      }
    }

    const now = new Date().toISOString();
    const stamp = {
      applied_at: now,
      applied_by_id: user.id,
      applied_by_name: user.full_name || user.email || "",
    };

    if (action === "dismiss") {
      const updated = await base44.asServiceRole.entities.AssistantProposal.update(proposalId, {
        status: "dismissed",
        ...stamp,
      });
      return Response.json({ proposal: updated });
    }

    const job = await base44.asServiceRole.entities.Job.get(proposal.job_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!job) return Response.json({ error: "Job no longer exists" }, { status: 404 });
    if (job.organization_id !== user.organization_id) {
      return Response.json({ error: "Job is not in your organization" }, { status: 403 });
    }

    let resultId = "";

    if (proposal.proposal_type === "job_update") {
      const { patch, unknown } = buildPatch(proposal.changes);
      if (unknown.length) {
        return Response.json({ error: `Unsupported or invalid fields: ${unknown.join(", ")}` }, { status: 400 });
      }
      if (!Object.keys(patch).length) return Response.json({ error: "No valid changes to apply" }, { status: 400 });
      await base44.asServiceRole.entities.Job.update(job.id, { ...patch, last_activity_date: now });
    } else if (proposal.proposal_type === "job_note") {
      const noteText = String(proposal.payload?.note_text || "").trim();
      if (!noteText) return Response.json({ error: "This proposal has no note text" }, { status: 400 });
      const notes = Array.isArray(job.notes) ? [...job.notes] : [];
      notes.push({
        id: crypto.randomUUID(),
        text: noteText,
        author_id: user.id,
        author_name: stamp.applied_by_name,
        created_at: now,
        is_todo: proposal.payload?.is_todo === true,
        is_completed: false,
        due_date: proposal.payload?.due_date || "",
      });
      await base44.asServiceRole.entities.Job.update(job.id, { notes, last_activity_date: now });
    } else if (proposal.proposal_type === "estimate") {
      const payload = proposal.payload || {};
      const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];
      if (!lineItems.length) return Response.json({ error: "This proposal has no line items" }, { status: 400 });

      const estimateNumber = await nextEstimateNumber(base44, user.organization_id);
      const today = now.slice(0, 10);

      const estimate = await base44.asServiceRole.entities.Estimate.create({
        organization_id: user.organization_id,
        job_id: job.id,
        job_number: job.job_number || "",
        estimate_number: estimateNumber,
        share_token: crypto.randomUUID(),
        estimate_date: today,
        expiration_date: payload.expiration_date || "",
        service_category: payload.service_category || undefined,
        status: "Draft",
        line_items: lineItems,
        subtotal: payload.subtotal || 0,
        discount_percent: payload.discount_percent || 0,
        tax_percent: payload.tax_percent || 0,
        total: payload.total || 0,
        notes: payload.notes || "",
        internal_notes: payload.internal_notes || "",
        view_mode: "detail",
      });
      resultId = estimate.id;
    } else {
      return Response.json({ error: "Unknown proposal type" }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.AssistantProposal.update(proposalId, {
      status: "applied",
      result_id: resultId,
      ...stamp,
    });

    return Response.json({ proposal: updated, result_id: resultId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}