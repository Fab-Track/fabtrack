import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Returns all TimeEntry records for the caller's organization.
 * Restricted to admin/manager roles — enforced on the backend.
 * Uses service role to bypass RLS (which restricts employees to their own entries).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const roles = user.roles || (user.role ? [user.role] : []);
    const normalizedRoles = roles.map(r => r.toLowerCase());
    const managerRoles = ['owner', 'admin', 'shop_manager', 'foreman', 'payroll'];
    const isManager = normalizedRoles.some(r => managerRoles.includes(r));
    if (!isManager) return Response.json({ error: 'Access denied — manager role required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user.organization_id || null;

    const filter = orgId ? { organization_id: orgId } : {};
    const entries = await base44.asServiceRole.entities.TimeEntry.filter(filter, '-clock_in', 2000);

    return Response.json({ entries });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});