import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { sendOrgEmailViaResend } from '../../shared/email.js';

// Shared invite-email sender used by createOrganization and inviteOrgUser.
// Routes through the org's own Resend config so invites come from the
// company's verified domain. Returns a blocked error if the org hasn't
// configured their email yet.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organization_id) {
      return Response.json({ error: 'No organization linked to your account' }, { status: 403 });
    }

    const { to, subject, text } = await req.json();
    if (!to || !subject || !text) {
      return Response.json({ error: 'to, subject, and text are required' }, { status: 400 });
    }

    // Resolve org business email for reply-to
    let orgEmail = null;
    try {
      const orgs = await base44.asServiceRole.entities.Organization.filter({ id: user.organization_id });
      if (orgs?.[0]?.email) orgEmail = orgs[0].email;
    } catch { /* non-fatal */ }

    const result = await sendOrgEmailViaResend(base44, user.organization_id, {
      to,
      subject,
      text,
      replyTo: orgEmail || user.email || null,
    });

    if (!result.ok) {
      return Response.json(
        { ok: false, error: result.error, code: result.code },
        { status: result.status || 500 }
      );
    }

    return Response.json({ ok: true, id: result.id, from: result.from });
  } catch (error) {
    return Response.json({ ok: false, error: error.message });
  }
});