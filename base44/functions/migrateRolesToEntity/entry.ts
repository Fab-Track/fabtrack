import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Standard roles to create for each existing org during migration
// Keys match the existing User entity enum so all current role checks continue to work
const STANDARD_ROLES = [
  { key: 'owner',           name: 'Owner',            archetype: 'admin',      description: 'Full access — organization owner' },
  { key: 'admin',           name: 'Admin',            archetype: 'admin',      description: 'Administrative access' },
  { key: 'shop_manager',    name: 'Shop Manager',    archetype: 'admin',      description: 'Shop floor management and scheduling' },
  { key: 'estimator',       name: 'Estimator',        archetype: 'sales',      description: 'Sales pipeline and estimating' },
  { key: 'design_specialist', name: 'Design Specialist', archetype: 'shop_floor', description: 'Drawing and design work' },
  { key: 'fabricator',      name: 'Fabricator',       archetype: 'shop_floor', description: 'Shop floor fabrication and installation' },
  { key: 'installer',       name: 'Installer',        archetype: 'shop_floor', description: 'Field installation' },
  { key: 'accountant',      name: 'Accountant',       archetype: 'finance',    description: 'Invoices and financial reports' },
  { key: 'payroll',         name: 'Payroll',          archetype: 'finance',    description: 'Time and payroll management' },
];

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

    // 1. Get all organizations
    const orgs = await base44.asServiceRole.entities.Organization.list(undefined, 500);
    const results = [];

    for (const org of orgs) {
      const orgResult = { org_id: org.id, org_name: org.name, roles_created: 0, users_updated: 0, skipped: false };

      // 2. Check if Role records already exist for this org (idempotent)
      const existingRoles = await base44.asServiceRole.entities.Role.filter({ org_id: org.id });
      const keyToRoleId = {};

      // Map existing roles
      for (const r of existingRoles) {
        keyToRoleId[r.key] = r.id;
      }

      // 3. Create missing standard roles
      for (const role of STANDARD_ROLES) {
        if (!keyToRoleId[role.key]) {
          const record = await base44.asServiceRole.entities.Role.create({
            ...role,
            org_id: org.id,
            is_default: true,
          });
          keyToRoleId[role.key] = record.id;
          orgResult.roles_created++;
        }
      }

      // 4. Get all users in this org
      const users = await base44.asServiceRole.entities.User.filter({ organization_id: org.id });

      // 5. For each user, build role_ids from their roles array
      for (const u of users) {
        const userRoleKeys = (u.roles && u.roles.length > 0)
          ? u.roles
          : (u.role ? [u.role] : []);

        // Skip super_admin-only users (no org-scoped roles to migrate)
        if (userRoleKeys.length === 0) continue;

        const roleIds = userRoleKeys
          .map(key => keyToRoleId[key])
          .filter(id => id != null);

        // Only update if role_ids is empty (don't overwrite manual assignments)
        if (roleIds.length > 0 && (!u.role_ids || u.role_ids.length === 0)) {
          await base44.asServiceRole.entities.User.update(u.id, {
            role_ids: roleIds,
            // Keep roles array in sync (it already has the keys, but ensure consistency)
            roles: userRoleKeys,
          });
          orgResult.users_updated++;
        }
      }

      results.push(orgResult);
    }

    return Response.json({
      success: true,
      migrated_orgs: results.length,
      total_roles_created: results.reduce((sum, r) => sum + r.roles_created, 0),
      total_users_updated: results.reduce((sum, r) => sum + r.users_updated, 0),
      details: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});