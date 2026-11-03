import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { buildPatch, labelFor } from "../../shared/assistantChanges.js";

// Creates a PENDING proposal only. Nothing on the job or in estimating changes here —
// a person has to confirm the proposal in the app first.

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.organization_id) return Response.json({ error: "No organization on this account" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action, job_id, conversation_id, title, notes } = body;
    if (!job_id) return Response.json({ error: "job_id is required" }, { status: 400 });

    const job = await base44.asServiceRole.entities.Job.get(job_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
    if (job.organization_id !== user.organization_id) {
      return Response.json({ error: "Job is not in your organization" }, { status: 403 });
    }

    const base = {
      organization_id: user.organization_id,
      conversation_id: conversation_id || "",
      job_id: job.id,
      job_number: job.job_number || "",
      job_name: job.job_name || "",
      status: "pending",
    };

    if (action === "create_job_update") {
      const { patch, clean, unknown } = buildPatch(body.changes);
      if (unknown.length) {
        return Response.json({ error: `Unsupported or invalid fields: ${unknown.join(", ")}` }, { status: 400 });
      }
      if (!clean.length) return Response.json({ error: "No valid changes supplied" }, { status: 400 });

      const record = await base44.asServiceRole.entities.AssistantProposal.create({
        ...base,
        proposal_type: "job_update",
        title: title || `Update ${clean.length} field${clean.length === 1 ? "" : "s"}`,
        notes: notes || "",
        changes: clean,
      });
      return Response.json({ proposal_id: record.id, fields: Object.keys(patch) });
    }

    if (action === "create_job_note") {
      const noteText = String(body.note_text || "").trim();
      if (!noteText) return Response.json({ error: "note_text is required" }, { status: 400 });

      const record = await base44.asServiceRole.entities.AssistantProposal.create({
        ...base,
        proposal_type: "job_note",
        title: title || "Add a note to this job",
        notes: notes || "",
        payload: {
          note_text: noteText,
          is_todo: body.is_todo === true,
          due_date: body.due_date || "",
        },
      });
      return Response.json({ proposal_id: record.id });
    }

    if (action === "create_estimate") {
      const rawLines = Array.isArray(body.line_items) ? body.line_items : [];
      if (!rawLines.length) return Response.json({ error: "line_items is required" }, { status: 400 });

      const lineItems = rawLines.map((li) => {
        const quantity = num(li.quantity);
        const unitCost = num(li.unit_cost);
        return {
          category: li.category || "",
          service_name: li.service_name || "",
          description: li.description || li.service_name || "",
          quantity,
          unit: li.unit || "ea",
          unit_cost: unitCost,
          total: Math.round(quantity * unitCost * 100) / 100,
          install_location: li.install_location || "",
          color: li.color || "",
        };
      });

      const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
      const discountPercent = num(body.discount_percent);
      const taxPercent = num(body.tax_percent);
      const afterDiscount = subtotal * (1 - discountPercent / 100);
      const total = Math.round(afterDiscount * (1 + taxPercent / 100) * 100) / 100;

      const record = await base44.asServiceRole.entities.AssistantProposal.create({
        ...base,
        proposal_type: "estimate",
        title: title || `Estimate draft for ${job.job_name || job.job_number || "this job"}`,
        notes: notes || "",
        payload: {
          line_items: lineItems,
          subtotal: Math.round(subtotal * 100) / 100,
          discount_percent: discountPercent,
          tax_percent: taxPercent,
          total,
          service_category: body.service_category || "",
          notes: body.estimate_notes || "",
          internal_notes: body.internal_notes || "",
          expiration_date: body.expiration_date || "",
        },
      });
      return Response.json({ proposal_id: record.id, total });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}