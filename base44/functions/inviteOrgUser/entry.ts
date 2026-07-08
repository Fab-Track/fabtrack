import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    console.log('[inviteOrgUser] step: creating client from request');
    const base44 = createClientFromRequest(req);

    console.log('[inviteOrgUser] step: calling base44.auth.me()');
    const user = await base44.auth.me();
    console.log('[inviteOrgUser] caller user:', JSON.stringify({ id: user?.id, email: user?.email, role: user?.role, roles: user?.roles, organization_id: user?.organization_id }));
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
      console.log('[inviteOrgUser] step: caller built-in role is not admin, attempting sync. current role:', user.role);
      try {
        await base44.asServiceRole.entities.User.update(user.id, { role: 'admin' });
        console.log('[inviteOrgUser] step: role sync succeeded');
      } catch (syncErr) {
        console.log('[inviteOrgUser] step: role sync FAILED:', syncErr?.message, syncErr?.stack);
      }
    }

    const body = await req.json();
    console.log('[inviteOrgUser] incoming payload:', JSON.stringify(body));
    const { email, roles, action } = body;
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    const roleList = Array.isArray(roles) && roles.length ? roles : ['fabricator'];
    const isHighPriv = roleList.some(r => r === 'owner' || r === 'admin');
    const platformRole = isHighPriv ? 'admin' : 'user';

    console.log('[inviteOrgUser] step: calling base44.users.inviteUser with', JSON.stringify({ email, platformRole }));
    try {
      const inviteResult = await base44.users.inviteUser(email, platformRole);
      console.log('[inviteOrgUser] step: inviteUser succeeded:', JSON.stringify(inviteResult));
    } catch (inviteErr) {
      console.log('[inviteOrgUser] step: inviteUser THREW. message:', inviteErr?.message);
      console.log('[inviteOrgUser] step: inviteUser error stack:', inviteErr?.stack);
      console.log('[inviteOrgUser] step: inviteUser error full object:', JSON.stringify(inviteErr, Object.getOwnPropertyNames(inviteErr)));
      if (inviteErr?.response) {
        console.log('[inviteOrgUser] step: inviteUser error.response.status:', inviteErr.response.status);
        console.log('[inviteOrgUser] step: inviteUser error.response.data:', JSON.stringify(inviteErr.response.data));
      }
      throw inviteErr;
    }

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
    console.log('[inviteOrgUser] TOP-LEVEL CATCH. message:', error?.message);
    console.log('[inviteOrgUser] TOP-LEVEL CATCH. stack:', error?.stack);
    return Response.json({ error: error.message, stack: error?.stack }, { status: 500 });
  }
});