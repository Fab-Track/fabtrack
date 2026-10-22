import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve org-level settings: look for the gmail_system_sender record
    // which carries both the system sender Gmail config and the legacy
    // email/Resend config fields.
    let systemSenderEmail = null;
    let systemSenderStatus = 'disconnected';

    if (user.organization_id) {
      const records = await base44.asServiceRole.entities.AppSettings.filter({
        organization_id: user.organization_id,
        setting_key: 'gmail_system_sender',
      });
      const rec = records?.[0];
      if (rec) {
        systemSenderEmail = rec.system_sender_email || null;
        systemSenderStatus = rec.system_sender_status || 'disconnected';
      }
    }

    return Response.json({
      twilio_from_number: Deno.env.get('TWILIO_FROM_NUMBER') || null,
      system_sender_email: systemSenderEmail,
      system_sender_status: systemSenderStatus,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});