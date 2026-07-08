import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Custom pending-invite flow. This intentionally never calls the platform's
// base44.users.inviteUser — that API validates the caller's built-in `role`
// field, which is permanently locked to "owner" for the app's real owner
// account and cannot be changed. Instead, invites are tracked in our own
// PendingInvite entity and linked up automatically when the invitee registers
// (see the linkPendingInvite function).

function normEmail(e) {
  return (e || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // App-level role check only — never relies on the platform's built-in role field.
    const callerRoles = (user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])).map(r => (r || '').toLowerCase());
    const isOwnerOrAdmin = callerRoles.includes('owner') || callerRoles.includes('admin');
    if (!isOwnerOrAdmin) {
      return Response.json({ error: 'Only owners/admins can invite users' }, { status: 403 });
    }
    if (!user.organization_id) {
      return Response.json({ error: 'No organization on your account' }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action || 'create';

    if (action === 'delete') {
      const { invite_id } = body;
      if (!invite_id) return Response.json({ error: 'invite_id is required' }, { status: 400 });
      const invite = await base44.asServiceRole.entities.PendingInvite.get(invite_id);
      if (!invite || invite.organization_id !== user.organization_id) {
        return Response.json({ error: 'Invite not found' }, { status: 404 });
      }
      await base44.asServiceRole.entities.PendingInvite.delete(invite_id);
      return Response.json({ success: true });
    }

    if (action === 'update') {
      const { invite_id, email, roles, first_name, last_name, phone } = body;
      if (!invite_id) return Response.json({ error: 'invite_id is required' }, { status: 400 });
      const invite = await base44.asServiceRole.entities.PendingInvite.get(invite_id);
      if (!invite || invite.organization_id !== user.organization_id) {
        return Response.json({ error: 'Invite not found' }, { status: 404 });
      }

      const updates = {};
      if (email) {
        const newEmailNorm = normEmail(email);
        const existingInvites = await base44.asServiceRole.entities.PendingInvite.filter({ organization_id: user.organization_id });
        const dupe = existingInvites.find(i => i.id !== invite_id && normEmail(i.email) === newEmailNorm);
        if (dupe) return Response.json({ error: 'Another pending invite already uses that email' }, { status: 409 });
        updates.email = email.trim();
      }
      if (Array.isArray(roles) && roles.length) updates.roles = roles;
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      if (phone !== undefined) updates.phone = phone;

      await base44.asServiceRole.entities.PendingInvite.update(invite_id, updates);
      return Response.json({ success: true });
    }

    // action === 'create'
    const { email, roles, first_name, last_name, phone } = body;
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });
    const emailNorm = normEmail(email);
    const roleList = Array.isArray(roles) && roles.length ? roles : ['fabricator'];

    // Block if an active User in this org already has this email
    const orgUsers = await base44.asServiceRole.entities.User.filter({ organization_id: user.organization_id });
    if (orgUsers.some(u => normEmail(u.email) === emailNorm)) {
      return Response.json({ error: 'A user with this email already exists in your organization' }, { status: 409 });
    }

    // Block duplicate pending invites for the same email in this org
    const existingInvites = await base44.asServiceRole.entities.PendingInvite.filter({ organization_id: user.organization_id });
    if (existingInvites.some(i => normEmail(i.email) === emailNorm)) {
      return Response.json({ error: 'An invite has already been sent to this email' }, { status: 409 });
    }

    const invite = await base44.asServiceRole.entities.PendingInvite.create({
      organization_id: user.organization_id,
      organization_name: user.organization_name || '',
      first_name: first_name || '',
      last_name: last_name || '',
      email: email.trim(),
      roles: roleList,
      phone: phone || '',
      status: 'pending',
      invited_by_id: user.id,
      invited_by_name: user.full_name || user.email,
    });

    // Try to email the invitee — failure doesn't block invite creation
    let emailSent = false;
    let emailError = null;
    try {
      const orgName = user.organization_name || 'your company';
      const html = `<p>Hi ${first_name || ''},</p><p>You've been added to <strong>${orgName}</strong> on FabTrack.</p><p>To activate your account, please register using this exact email address: <strong>${email.trim()}</strong></p><p>Once you sign up with this email, you'll automatically be added to the team with the correct access.</p>`;
      const text = `You've been added to ${orgName} on FabTrack. Register using this exact email address: ${email.trim()}`;
      const sendRes = await base44.functions.invoke('sendGmail', {
        to: email.trim(),
        subject: `You've been invited to join ${orgName} on FabTrack`,
        html_body: html,
        text_body: text,
        routing_type: 'system',
      });
      emailSent = !!sendRes?.data?.ok;
      if (!emailSent) emailError = sendRes?.data?.error || 'Unknown email error';
    } catch (e) {
      emailError = e?.message || 'Failed to send invite email';
    }

    return Response.json({
      success: true,
      invite_id: invite.id,
      email_sent: emailSent,
      email_error: emailSent ? null : emailError,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});