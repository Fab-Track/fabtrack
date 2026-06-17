import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const userRoles = user?.roles || [];
    if (!userRoles.includes('super_admin')) {
      return Response.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { status, type, organization_id, limit: rawLimit, skip } = body;
    const limit = Math.min(rawLimit || 50, 200);

    const issues = await base44.asServiceRole.entities.Issue.list('-created_date', 200);

    // Client-side filter
    let filtered = issues;
    if (status) filtered = filtered.filter((i) => i.status === status);
    if (type) filtered = filtered.filter((i) => i.type === type);
    if (organization_id) filtered = filtered.filter((i) => i.organization_id === organization_id);

    // Apply offset/limit
    const offset = skip || 0;
    const paged = filtered.slice(offset, offset + limit);
    const openCount = issues.filter((i) => i.status === 'open').length;
    const total = filtered.length;

    return Response.json({
      success: true,
      issues: paged,
      open_count: openCount,
      total,
      has_more: offset + limit < filtered.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});