import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, roles, action } = await req.json();
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    const roleList = Array.isArray(roles) && roles.length ? roles : ['fabricator'];
    const isHighPriv = roleList.some(r => r === 'owner' || r === 'admin');
    const platformRole = isHighPriv ? 'admin' : 'user';

    // Sends the platform invite email (or resends it for an existing invited user)
    await base44.auth.inviteUser(email, platformRole);

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
          role: roleList[0] || 'fabricator',
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