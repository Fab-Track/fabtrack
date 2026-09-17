import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { sendOrgEmailViaResend } from '../../shared/email.js';

// Sends a customer-facing email via the org's own Resend account.
// Delegates to the shared email helper which reads the org's AppSettings.
// If the org hasn't configured their email, returns a 403 with code
// 'email_not_configured' so the UI can prompt them to set it up.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organization_id) {
      return Response.json({ error: 'No organization linked to your account' }, { status: 403 });
    }

    const { to, subject, body, html, text } = await req.json();
    if (!to || !subject || (!body && !html && !text)) {
      return Response.json({ error: 'to, subject, and body are required' }, { status: 400 });
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
      html: html || (body ? body.replace(/\n/g, '<br>') : null),
      text: text || body,
      replyTo: orgEmail || user.email || null,
    });

    if (!result.ok) {
      return Response.json(
        { ok: false, error: result.error, code: result.code },
        { status: result.status || 500 }
      );
    }

    return Response.json({ ok: true, id: result.id, from: result.from, reply_to: orgEmail || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});