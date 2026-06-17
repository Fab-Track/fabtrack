import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = user.roles || [];
    if (!userRoles.includes('super_admin')) {
      return Response.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // LIST AUDIT LOGS
    if (action === 'list') {
      const { organizationId, limit: rawLimit } = body;
      const limit = Math.min(rawLimit || 50, 200);

      let logs;
      if (organizationId) {
        logs = await base44.asServiceRole.entities.SuperAdminAuditLog.filter({ organization_id: organizationId }, '-created_date', limit);
      } else {
        logs = await base44.asServiceRole.entities.SuperAdminAuditLog.list('-created_date', limit);
      }

      return Response.json({
        success: true,
        logs: logs.slice(0, limit),
      });
    }

    return Response.json({ error: `Unknown action: "${action}"` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});