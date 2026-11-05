import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { assistantAccess, forbidden } from "../../shared/assistantAccess.js";

// Saves organization-level knowledge the assistant should recall later.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.organization_id) return Response.json({ error: "No organization on this account" }, { status: 403 });

    const access = assistantAccess(user);
    if (!access) return forbidden();
    if (!access.knowledge) {
      return forbidden("Your role can't save or edit company knowledge in the assistant.");
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "save";

    if (action === "save") {
      const title = String(body.title || "").trim();
      const content = String(body.content || "").trim();
      if (!title || !content) {
        return Response.json({ error: "title and content are required" }, { status: 400 });
      }

      const record = await base44.asServiceRole.entities.AssistantKnowledge.create({
        organization_id: user.organization_id,
        title,
        content,
        category: body.category || "Other",
        is_active: true,
        source: "conversation",
        created_by_id: user.id,
        created_by_name: user.full_name || user.email || "",
      });
      return Response.json({ knowledge_id: record.id, title: record.title, category: record.category });
    }

    if (action === "update") {
      const id = String(body.knowledge_id || "").trim();
      if (!id) return Response.json({ error: "knowledge_id is required" }, { status: 400 });

      const existing = await base44.asServiceRole.entities.AssistantKnowledge.get(id)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!existing) return Response.json({ error: "Knowledge entry not found" }, { status: 404 });
      if (existing.organization_id !== user.organization_id) {
        return Response.json({ error: "Not in your organization" }, { status: 403 });
      }

      const patch = {};
      if (body.title != null) patch.title = String(body.title).trim();
      if (body.content != null) patch.content = String(body.content).trim();
      if (body.category != null) patch.category = body.category;
      if (body.is_active != null) patch.is_active = body.is_active === true;
      if (!Object.keys(patch).length) return Response.json({ error: "Nothing to update" }, { status: 400 });

      const updated = await base44.asServiceRole.entities.AssistantKnowledge.update(id, patch);
      return Response.json({ knowledge_id: updated.id, title: updated.title });
    }

    if (action === "delete") {
      const id = String(body.knowledge_id || "").trim();
      if (!id) return Response.json({ error: "knowledge_id is required" }, { status: 400 });

      const existing = await base44.asServiceRole.entities.AssistantKnowledge.get(id)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!existing) return Response.json({ error: "Knowledge entry not found" }, { status: 404 });
      if (existing.organization_id !== user.organization_id) {
        return Response.json({ error: "Not in your organization" }, { status: 403 });
      }

      await base44.asServiceRole.entities.AssistantKnowledge.delete(id);
      return Response.json({ deleted: id });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}