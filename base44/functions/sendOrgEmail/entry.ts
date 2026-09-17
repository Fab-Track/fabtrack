import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { sendOrgEmailViaResend } from '../../shared/email.js';

// Unified per-org email sender.
// All customer-facing email call sites (estimates, invoices, signature alerts,
// invites) invoke this function. It reads the calling org's Resend config from
// AppSettings and sends via Resend. If the org hasn't configured their email,
// it returns a 403 with code 'email_not_configured' so the UI can prompt them.
//
// Body: { to, subject, html?, text?, html_body?, text_body?, reply_to? }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organization_id) {
      return Response.json({ error: 'No organization linked to your account' }, { status: 403 });
    }

    const body = await req.json();
    const { to, subject, reply_to } = body;
    const html = body.html || body.html_body;
    const text = body.text || body.text_body;

    if (!to || !subject || (!html && !text)) {
      return Response.json({ error: 'to, subject, and html or text are required' }, { status: 400 });
    }

    const result = await sendOrgEmailViaResend(base44, user.organization_id, {
      to,
      subject,
      html,
      text,
      replyTo: reply_to || user.email || null,
    });

    if (!result.ok) {
      return Response.json(
        { ok: false, error: result.error, code: result.code },
        { status: result.status || 500 }
      );
    }

    return Response.json({ ok: true, id: result.id, from: result.from });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});