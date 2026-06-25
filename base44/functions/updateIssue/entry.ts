import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const userRoles = user?.roles || [];
    if (!userRoles.includes('super_admin')) {
      return Response.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { issue_id, issue_ids, status, admin_notes } = body;

    // Build the update payload
    const updateData = {};

    if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolved_by = user?.full_name || user?.email || 'Unknown';
        updateData.resolved_at = new Date().toISOString();
      }
    }

    if (admin_notes !== undefined && admin_notes !== null) {
      updateData.admin_notes = String(admin_notes).slice(0, 3000);
    }

    // Bulk mode — resolve/update multiple issues at once
    if (issue_ids && Array.isArray(issue_ids) && issue_ids.length > 0) {
      const result = await base44.asServiceRole.entities.Issue.bulkUpdate(
        issue_ids.map((id) => ({ id, ...updateData }))
      );
      return Response.json({ success: true, resolved_count: issue_ids.length });
    }

    // Single mode
    if (!issue_id) {
      return Response.json({ error: 'issue_id is required' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Issue.update(issue_id, updateData);

    return Response.json({ success: true, issue: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});