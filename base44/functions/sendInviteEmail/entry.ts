import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Shared invite-email sender used by createOrganization and inviteOrgUser.
// Sends via the Resend API so invites reach unregistered external addresses
// (Base44's Core.SendEmail integration only delivers to existing app users).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, text } = await req.json();
    if (!to || !subject || !text) {
      return Response.json({ error: 'to, subject, and text are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return Response.json({ ok: false, error: 'RESEND_API_KEY is not configured' }, { status: 200 });
    }
    const from = Deno.env.get('RESEND_FROM_EMAIL') || 'FabTrack <invites@fab-track.io>';

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    });

    const data = await resp.json();
    console.log(`[sendInviteEmail] to=${to} status=${resp.status} data=${JSON.stringify(data)}`);

    if (!resp.ok) {
      return Response.json({ ok: false, error: data?.message || `Resend error (${resp.status})` });
    }

    return Response.json({ ok: true, id: data?.id });
  } catch (error) {
    return Response.json({ ok: false, error: error.message });
  }
});