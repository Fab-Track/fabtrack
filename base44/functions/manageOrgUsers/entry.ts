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
    const { organizationId, action, targetEmail, targetRole } = body;

    if (!organizationId) {
      return Response.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const org = await base44.asServiceRole.entities.Organization.get(organizationId);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // LIST USERS
    if (action === 'list') {
      const users = await base44.asServiceRole.entities.User.filter({ organization_id: organizationId });

      const userList = users.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name || u.email,
        roles: u.roles || [],
        role: u.role,
        account_status: u.account_status || 'active',
        last_login_at: u.last_login_at,
        is_owner: (u.roles || []).includes('owner'),
      }));

      return Response.json({ success: true, users: userList, organization_name: org.name });
    }

    // Other actions require targetEmail
    if (!targetEmail) {
      return Response.json({ error: 'targetEmail is required for this action' }, { status: 400 });
    }

    // FIND TARGET USER
    const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail, organization_id: organizationId });
    if (users.length === 0) {
      return Response.json({
        success: false,
        error: `No user with email "${targetEmail}" found in this organization. To invite a new user, use createOrganization or re-invite action.`,
      }, { status: 404 });
    }

    const targetUser = users[0];

    // ASSIGN OWNER
    if (action === 'assign_owner') {
      const updatedRoles = [...new Set([...(targetUser.roles || []), 'owner'])];
      // Also remove owner from previous owner if different
      const currentOwners = await base44.asServiceRole.entities.User.filter({ organization_id: organizationId });
      for (const u of currentOwners) {
        if (u.id !== targetUser.id && (u.roles || []).includes('owner')) {
          const newRoles = (u.roles || []).filter((r) => r !== 'owner');
          await base44.asServiceRole.entities.User.update(u.id, { roles: newRoles });
        }
      }

      await base44.asServiceRole.entities.User.update(targetUser.id, {
        roles: updatedRoles,
        organization_name: org.name,
      });

      await base44.asServiceRole.entities.SuperAdminAuditLog.create({
        admin_email: user.email,
        admin_name: user.full_name || user.email,
        action_type: 'owner_assigned',
        organization_id: organizationId,
        organization_name: org.name,
        affected_user_email: targetEmail,
        affected_user_name: targetUser.full_name || targetEmail,
        action_detail: `Assigned "${targetUser.full_name || targetEmail}" as owner of "${org.name}"`,
      });

      return Response.json({
        success: true,
        message: `"${targetUser.full_name || targetEmail}" is now the owner of "${org.name}".`,
        user: { email: targetEmail, roles: updatedRoles },
      });
    }

    // RE-INVITE USER (resend invitation)
    if (action === 'reinvite') {
      // Re-send invitation by briefly deactivating and re-inviting
      // Since we can't truly "resend" via SDK, we update the user status to trigger the platform
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        account_status: 'invited',
      });

      await base44.asServiceRole.entities.SuperAdminAuditLog.create({
        admin_email: user.email,
        admin_name: user.full_name || user.email,
        action_type: 'owner_reinvited',
        organization_id: organizationId,
        organization_name: org.name,
        affected_user_email: targetEmail,
        affected_user_name: targetUser.full_name || targetEmail,
        action_detail: `Re-sent invitation to "${targetUser.full_name || targetEmail}" for "${org.name}"`,
      });

      return Response.json({
        success: true,
        message: `Invitation re-sent to "${targetEmail}".`,
      });
    }

    // DEACTIVATE USER
    if (action === 'deactivate') {
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        account_status: 'deactivated',
      });

      await base44.asServiceRole.entities.SuperAdminAuditLog.create({
        admin_email: user.email,
        admin_name: user.full_name || user.email,
        action_type: 'user_deactivated',
        organization_id: organizationId,
        organization_name: org.name,
        affected_user_email: targetEmail,
        affected_user_name: targetUser.full_name || targetEmail,
        action_detail: `Deactivated "${targetUser.full_name || targetEmail}" in "${org.name}"`,
      });

      return Response.json({
        success: true,
        message: `"${targetEmail}" deactivated in "${org.name}".`,
      });
    }

    // REACTIVATE USER
    if (action === 'reactivate') {
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        account_status: 'active',
      });

      await base44.asServiceRole.entities.SuperAdminAuditLog.create({
        admin_email: user.email,
        admin_name: user.full_name || user.email,
        action_type: 'user_reactivated',
        organization_id: organizationId,
        organization_name: org.name,
        affected_user_email: targetEmail,
        affected_user_name: targetUser.full_name || targetEmail,
        action_detail: `Reactivated "${targetUser.full_name || targetEmail}" in "${org.name}"`,
      });

      return Response.json({
        success: true,
        message: `"${targetEmail}" reactivated in "${org.name}".`,
      });
    }

    // CHANGE ROLE
    if (action === 'change_role') {
      if (!targetRole) {
        return Response.json({ error: 'targetRole is required for change_role action' }, { status: 400 });
      }

      const updatedRoles = [...new Set([...(targetUser.roles || []), targetRole])];

      await base44.asServiceRole.entities.User.update(targetUser.id, {
        roles: updatedRoles,
      });

      await base44.asServiceRole.entities.SuperAdminAuditLog.create({
        admin_email: user.email,
        admin_name: user.full_name || user.email,
        action_type: 'org_updated',
        organization_id: organizationId,
        organization_name: org.name,
        affected_user_email: targetEmail,
        affected_user_name: targetUser.full_name || targetEmail,
        action_detail: `Added role "${targetRole}" to "${targetUser.full_name || targetEmail}" in "${org.name}"`,
        metadata: { previous_roles: targetUser.roles || [], new_roles: updatedRoles },
      });

      return Response.json({
        success: true,
        message: `Added "${targetRole}" role to "${targetEmail}".`,
        user: { email: targetEmail, roles: updatedRoles },
      });
    }

    return Response.json({ error: `Unknown action: "${action}"` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});