import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Sends a customer-facing email via Resend.
// From: "<Org Name> <no-reply@invites.fab-track.io>" (verified domain only)
// Reply-To: the sending organization's business email.
// Org context is always derived server-side from the authenticated caller.
const VERIFIED_DOMAIN = '@invites.fab-track.io';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organization_id) return Response.json({ error: 'No organization linked to your account' }, { status: 403 });

    const { to, subject, body, html } = await req.json();
    if (!to || !subject || (!body && !html)) {
      return Response.json({ error: 'to, subject, and body are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return Response.json({ error: 'Email service not configured' }, { status: 503 });

    // Caller's own org only — service role is scoped by the caller's organization_id
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: user.organization_id });
    const org = orgs[0];
    if (!org) return Response.json({ error: 'Organization not found' }, { status: 404 });

    // Only the verified invites subdomain may be used as the from-address
    let fromAddress = (Deno.env.get('RESEND_FROM_EMAIL') || '').trim();
    if (!fromAddress.toLowerCase().endsWith(VERIFIED_DOMAIN)) {
      fromAddress = `no-reply${VERIFIED_DOMAIN}`;
    }

    const payload = {
      from: `${org.name} <${fromAddress}>`,
      to: [to],
      subject,
    };
    if (html) payload.html = html;
    if (body) payload.text = body;
    if (org.email) payload.reply_to = org.email;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return Response.json({ ok: false, error: data?.message || 'Email send failed' }, { status: 502 });
    }
    return Response.json({ ok: true, id: data.id, from: payload.from, reply_to: org.email || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});