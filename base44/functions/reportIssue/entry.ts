import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json();

    const { type, title, description, screenshot_url, error_stack, error_context, page_url } = body;

    if (!type || !title || !description) {
      return Response.json({ error: 'type, title, and description are required' }, { status: 400 });
    }

    if (!['user_report', 'system_error'].includes(type)) {
      return Response.json({ error: 'type must be user_report or system_error' }, { status: 400 });
    }

    // Determine organization context
    let organizationId = 'unknown';
    let organizationName = 'Unknown';

    if (user?.organization_id) {
      organizationId = user.organization_id;
      try {
        const org = await base44.asServiceRole.entities.Organization.get(user.organization_id);
        organizationName = org?.name || 'Unknown';
      } catch (_) { /* org lookup failed, use fallback */ }
    }

    const pageRoute = page_url ? (() => {
      try { return new URL(page_url).pathname; } catch (_) { return null; }
    })() : null;

    const record = await base44.asServiceRole.entities.Issue.create({
      type,
      title: String(title).slice(0, 300),
      description: String(description).slice(0, 3000),
      screenshot_url: screenshot_url || null,
      organization_id: organizationId,
      organization_name: organizationName,
      user_id: user?.id || 'anonymous',
      user_name: user?.full_name || user?.email || 'Anonymous',
      user_role: (user?.roles || []).join(', ') || (user?.role || 'unknown'),
      page_url: page_url || null,
      page_route: pageRoute,
      error_stack: error_stack ? String(error_stack).slice(0, 3000) : null,
      error_context: error_context ? String(error_context).slice(0, 3000) : null,
      status: 'open',
    });

    return Response.json({ success: true, issue_id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});