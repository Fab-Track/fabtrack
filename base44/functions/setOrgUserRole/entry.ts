import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Lets an org owner/admin change another user's app role within their OWN org.
// Role fields on User are write-protected client-side, so this is the only path.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const callerRoles = (user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])).map(r => (r || '').toLowerCase());
    const isOwner = callerRoles.includes('owner') || callerRoles.includes('super_admin');
    const isAdmin = isOwner || callerRoles.includes('admin');
    if (!isAdmin) {
      return Response.json({ error: 'Only owners/admins can change roles' }, { status: 403 });
    }
    if (!user.organization_id) {
      return Response.json({ error: 'No organization on your account' }, { status: 400 });
    }

    const { target_user_id, new_role } = await req.json();
    if (!target_user_id || !new_role) {
      return Response.json({ error: 'target_user_id and new_role are required' }, { status: 400 });
    }

    // Target must belong to the caller's own org — org context derived server-side
    const targetUser = await base44.asServiceRole.entities.User.get(target_user_id).catch(() => null);
    if (!targetUser || targetUser.organization_id !== user.organization_id) {
      return Response.json({ error: 'User not found in your organization' }, { status: 404 });
    }

    const targetRoles = (targetUser.roles || []).map(r => (r || '').toLowerCase());

    // Only an owner may change an owner's role
    if (targetRoles.includes('owner') && !isOwner) {
      return Response.json({ error: "Only an owner can change another owner's role" }, { status: 403 });
    }

    // Only one owner per org
    if (new_role === 'owner') {
      const orgUsers = await base44.asServiceRole.entities.User.filter({ organization_id: user.organization_id });
      const existingOwner = orgUsers.find(u =>
        u.id !== target_user_id &&
        (u.roles || []).map(r => (r || '').toLowerCase()).includes('owner') &&
        (u.account_status || 'active') !== 'deactivated'
      );
      if (existingOwner) {
        return Response.json({ error: 'There can only be one Owner.' }, { status: 409 });
      }
    }

    // Replace app roles with the new role, preserving super_admin if present
    const newRoles = targetRoles.includes('super_admin') ? [new_role, 'super_admin'] : [new_role];

    // Sync role_ids from this org's Role records
    const roleRecords = await base44.asServiceRole.entities.Role.filter({ org_id: user.organization_id, key: new_role });
    const roleIds = roleRecords.length > 0 ? [roleRecords[0].id] : [];

    await base44.asServiceRole.entities.User.update(target_user_id, {
      roles: newRoles,
      role_ids: roleIds,
    });

    return Response.json({ success: true, roles: newRoles });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});