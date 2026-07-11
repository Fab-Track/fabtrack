import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
      const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (!accountSid || !authToken) {
        // Twilio not configured — mark as simulated
        sendResult = { success: true, sid: 'SIMULATED_' + Date.now(), simulated: true };
      } else {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const formData = new URLSearchParams({
          To: to_phone,
          From: from_phone || Deno.env.get('TWILIO_FROM_NUMBER') || '',
          Body: message_body,
        });
        const resp = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
        const data = await resp.json();
        if (resp.ok) {
          sendResult = { success: true, sid: data.sid };
        } else {
          sendResult = { success: false, error: data.message || 'Twilio error' };
        }
      }
    } else if (channel === 'Email') {
      // Always use built-in email integration (no SendGrid required)
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: to_email,
        subject: subject || '(no subject)',
        body: message_body,
        from_name: from_name || 'High Country Metal Works',
      });
      sendResult = { success: true, sid: null };
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