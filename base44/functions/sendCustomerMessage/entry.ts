import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getOrgTwilioConfig, resolveTwilioCredentials, sendTwilioSms } from '../../shared/twilio.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message_id, channel, to_phone, to_email, from_phone, from_email, from_name, subject, message_body, attachments = [] } = body;

    if (!channel || !message_body) {
      return Response.json({ error: 'channel and message_body required' }, { status: 400 });
    }

    let sendResult = { success: false, sid: null, error: null };

    if (channel === 'SMS') {
      const twilioConfig = await getOrgTwilioConfig(base44, user.organization_id);
      const creds = resolveTwilioCredentials(twilioConfig);

      if (!creds) {
        // Twilio not configured — mark as simulated
        sendResult = { success: true, sid: 'SIMULATED_' + Date.now(), simulated: true };
      } else {
        const smsResult = await sendTwilioSms(creds, to_phone, message_body, from_phone);
        if (smsResult.ok) {
          sendResult = { success: true, sid: smsResult.sid };
        } else {
          sendResult = { success: false, error: smsResult.error };
        }
      }
    } else if (channel === 'Email') {
      // Route through Resend — org-branded from + reply-to derived server-side
      const resp = await base44.functions.invoke('sendResendEmail', {
        to: to_email,
        subject: subject || '(no subject)',
        body: message_body,
      });
      if (resp.data?.ok) {
        sendResult = { success: true, sid: resp.data.id || null };
      } else {
        sendResult = { success: false, error: resp.data?.error || 'Email send failed' };
      }
    }

    // Update the CommMessage record if provided — only within the caller's own org
    if (message_id) {
      const existing = await base44.asServiceRole.entities.CommMessage.get(message_id).catch(() => null);
      if (!existing || existing.organization_id !== user.organization_id) {
        return Response.json({ error: 'Message record not found' }, { status: 404 });
      }
      const updateData = sendResult.success
        ? { status: 'sent', sent_at: new Date().toISOString(), twilio_sid: sendResult.sid || null }
        : { status: 'failed', error_message: sendResult.error };
      await base44.asServiceRole.entities.CommMessage.update(message_id, updateData);
    }

    return Response.json({ ok: sendResult.success, ...sendResult });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});