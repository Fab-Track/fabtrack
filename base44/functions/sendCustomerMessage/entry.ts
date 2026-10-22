import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getOrgTwilioConfig, resolveTwilioCredentials, sendTwilioSms } from '../../shared/twilio.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message_id, channel, to_phone, to_email, from_phone, from_email, from_name, subject, message_body, sender_employee_id, attachments = [] } = body;

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
      // Route through Gmail (system sender or user's connected Gmail) instead of Resend.
      // sendGmail with routing_type="user_message" tries the sender's Gmail first,
      // then falls back to the org's system sender — no stale Resend config involved.
      const htmlBody = `<div style="font-family:sans-serif;white-space:pre-wrap;">${message_body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
      try {
        const resp = await base44.functions.invoke('sendGmail', {
          to: to_email,
          subject: subject || '(no subject)',
          html_body: htmlBody,
          text_body: message_body,
          routing_type: 'user_message',
          sender_employee_id: sender_employee_id || null,
        });
        if (resp.data?.ok) {
          sendResult = {
            success: true,
            sid: resp.data.message_id || null,
            gmail_message_id: resp.data.message_id || null,
            gmail_thread_id: resp.data.thread_id || null,
            from_email: resp.data.from || null,
          };
        } else {
          sendResult = { success: false, error: resp.data?.error || 'Email send failed' };
        }
      } catch (invokeErr) {
        sendResult = { success: false, error: invokeErr.message || 'Email send failed' };
      }
    }

    // Update the CommMessage record if provided — only within the caller's own org
    if (message_id) {
      const existing = await base44.asServiceRole.entities.CommMessage.get(message_id).catch(() => null);
      if (!existing || existing.organization_id !== user.organization_id) {
        return Response.json({ error: 'Message record not found' }, { status: 404 });
      }
      const updateData = sendResult.success
        ? {
            status: 'sent',
            sent_at: new Date().toISOString(),
            twilio_sid: sendResult.sid || null,
            gmail_message_id: sendResult.gmail_message_id || null,
            gmail_thread_id: sendResult.gmail_thread_id || null,
            from_email: sendResult.from_email || existing.from_email,
          }
        : { status: 'failed', error_message: sendResult.error };
      await base44.asServiceRole.entities.CommMessage.update(message_id, updateData);
    }

    return Response.json({ ok: sendResult.success, ...sendResult });
  } catch (error) {
    // Mark the CommMessage as failed so it's not stuck on 'sent'/'queued'
    if (message_id) {
      try {
        const existing = await base44.asServiceRole.entities.CommMessage.get(message_id).catch(() => null);
        if (existing && existing.organization_id === user.organization_id) {
          await base44.asServiceRole.entities.CommMessage.update(message_id, {
            status: 'failed',
            error_message: error.message,
          });
        }
      } catch { /* best-effort */ }
    }
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});