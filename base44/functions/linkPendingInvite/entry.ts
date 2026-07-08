import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Links a freshly-registered User to a PendingInvite by email (case-insensitive,
// whitespace-trimmed). Applies the pre-assigned organization + roles, links any
// existing Employee record with the same email (via linkEmployeeToUser), then
// removes the PendingInvite. Called automatically on login for users with no
// organization_id yet (see AuthContext).

function normEmail(e) {
  return (e || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ linked: false, reason: 'No email on user account' });

    const emailNorm = normEmail(user.email);
    const allInvites = await base44.asServiceRole.entities.PendingInvite.list();
    const invite = allInvites.find(i => normEmail(i.email) === emailNorm);
    if (!invite) {
      return Response.json({ linked: false, reason: 'No matching invite' });
    }

    // Multi-org safety: never override an existing org assignment with a different org's invite
    if (user.organization_id && user.organization_id !== invite.organization_id) {
      return Response.json({ linked: false, reason: 'User already belongs to a different organization' });
    }

    const roleList = Array.isArray(invite.roles) && invite.roles.length ? invite.roles : ['fabricator'];
    await base44.asServiceRole.entities.User.update(user.id, {
      organization_id: invite.organization_id,
      organization_name: invite.organization_name || null,
      roles: roleList,
      role: roleList[0],
      account_status: 'active',
    });

    // Link any existing Employee record with the same email (reuses existing logic, no duplicates)
    try {
      await base44.functions.invoke('linkEmployeeToUser', {});
    } catch (e) {
      // Non-fatal — no matching Employee is a normal outcome
    }

    await base44.asServiceRole.entities.PendingInvite.delete(invite.id);

    return Response.json({ linked: true, organization_id: invite.organization_id, roles: roleList });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});