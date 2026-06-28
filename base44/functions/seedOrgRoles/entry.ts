import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Default roles seeded for every new org
const DEFAULT_ROLES = [
  { key: 'owner',      name: 'Owner',      archetype: 'admin',      description: 'Full access to all features and settings.' },
  { key: 'manager',    name: 'Manager',    archetype: 'admin',      description: 'Manages jobs, schedules, and team. Can view reports.' },
  { key: 'fabricator', name: 'Fabricator', archetype: 'shop_floor', description: 'Sees assigned jobs, clocks in/out, and accesses the shop floor.' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = user.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');
    const isOwnerOrAdmin = userRoles.includes('owner') || userRoles.includes('admin') || userRoles.includes('manager');

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { orgId } = body;

    if (!orgId) {
      return Response.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Check for existing roles (idempotent)
    const existingRoles = await base44.asServiceRole.entities.Role.filter({ org_id: orgId });
    const existingKeys = new Set(existingRoles.map(r => r.key));

    const created = [];
    for (const role of DEFAULT_ROLES) {
      if (!existingKeys.has(role.key)) {
        const record = await base44.asServiceRole.entities.Role.create({
          ...role,
          org_id: orgId,
          is_default: true,
        });
        created.push(record);
      }
    }

    // Return all roles for this org (existing + newly created)
    const allRoles = await base44.asServiceRole.entities.Role.filter({ org_id: orgId });

    return Response.json({
      success: true,
      organization_id: orgId,
      roles: allRoles.map(r => ({ id: r.id, key: r.key, name: r.name, archetype: r.archetype, is_default: r.is_default })),
      created_count: created.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});