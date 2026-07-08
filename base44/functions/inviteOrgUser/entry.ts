import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Base44's inviteUser requires the caller's built-in `role` field to literally be
    // "admin" — but this app stores its own owner/admin/etc. designation in the separate
    // `roles` array, so the built-in field can drift to a custom value. Re-sync it here
    // for owner-level app users so inviting doesn't fail with "Could not validate credentials".
    const callerAppRoles = (user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])).map(r => (r || '').toLowerCase());
    const callerIsOwnerLevel = callerAppRoles.some(r => ['owner', 'admin', 'manager'].includes(r));
    if (!callerIsOwnerLevel) {
      return Response.json({ error: 'Only owners/admins can invite users' }, { status: 403 });
    }
    if (user.role !== 'admin') {
      try {
        await base44.asServiceRole.entities.User.update(user.id, { role: 'admin' });
      } catch {
        // The app's own owner account can't have its role changed — ignore and proceed.
      }
    }

    const { email, roles, action } = await req.json();
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    const roleList = Array.isArray(roles) && roles.length ? roles : ['fabricator'];
    const isHighPriv = roleList.some(r => r === 'owner' || r === 'admin');
    const platformRole = isHighPriv ? 'admin' : 'user';

    // Sends the platform invite email (or resends it for an existing invited user)
    await base44.users.inviteUser(email, platformRole);

    if (action === 'resend') {
      return Response.json({ success: true, resent: true });
    }

    // Scope the newly-invited user into this caller's organization. The User
    // record may not be immediately queryable right after inviteUser, so retry briefly.
    let linked = false;
    for (let i = 0; i < 5 && !linked; i++) {
      const matches = await base44.asServiceRole.entities.User.filter({ email });
      if (matches?.[0]?.id) {
        await base44.asServiceRole.entities.User.update(matches[0].id, {
          organization_id: user.organization_id || null,
          organization_name: user.organization_name || null,
          roles: roleList,
          account_status: 'invited',
        });
        linked = true;
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return Response.json({ success: true, linked });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});