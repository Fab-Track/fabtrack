import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ensureValidToken, buildRawEmail, sendGmailMessage } from '../../shared/gmail.js';

// Sends an email from a connected conversation EmailAccount via Gmail API.
// Body params: email_account_id, to_email, to_name, subject, body, from_name
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { email_account_id, to_email, to_name, subject, body: messageBody, from_name, message_id } = body;

    if (!email_account_id) return Response.json({ error: 'email_account_id required' }, { status: 400 });
    if (!to_email) return Response.json({ error: 'Recipient email required' }, { status: 400 });
    if (!messageBody) return Response.json({ error: 'Message body required' }, { status: 400 });

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'OAuth credentials not configured.' }, { status: 500 });
    }

    // Get the EmailAccount
    const account = await base44.asServiceRole.entities.EmailAccount.get(email_account_id).catch(() => null);
    if (!account || account.organization_id !== user.organization_id) {
      return Response.json({ error: 'Email account not found' }, { status: 404 });
    }
    if (account.status !== 'connected') {
      return Response.json({ error: 'Email account is not connected' }, { status: 400 });
    }

    // Refresh token if needed
    const tokenInfo = await ensureValidToken(account, clientId, clientSecret);
    if (tokenInfo.access_token !== account.access_token && tokenInfo.expiry) {
      await base44.asServiceRole.entities.EmailAccount.update(account.id, {
        access_token: tokenInfo.access_token,
        token_expiry: tokenInfo.expiry,
      });
    }

    // Build and send the raw email
    const rawEmail = buildRawEmail({
      fromName: from_name || account.display_name,
      fromEmail: account.email,
      toEmail,
      subject,
      body: messageBody,
    });

    const sendResult = await sendGmailMessage(tokenInfo.access_token, rawEmail);

    // Update or create CommMessage record
    if (message_id) {
      const existing = await base44.asServiceRole.entities.CommMessage.get(message_id).catch(() => null);
      if (existing && existing.organization_id === user.organization_id) {
        await base44.asServiceRole.entities.CommMessage.update(message_id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
          gmail_message_id: sendResult.id || null,
          gmail_thread_id: sendResult.threadId || null,
          email_account_id: account.id,
          from_email: account.email,
          from_name: from_name || account.display_name,
        });
      }
    } else {
      await base44.asServiceRole.entities.CommMessage.create({
        organization_id: user.organization_id,
        channel: 'Email',
        direction: 'outbound',
        status: 'sent',
        to_email,
        to_name: to_name || '',
        from_email: account.email,
        from_name: from_name || account.display_name,
        subject: subject || '(no subject)',
        body: messageBody,
        sent_at: new Date().toISOString(),
        gmail_message_id: sendResult.id || null,
        gmail_thread_id: sendResult.threadId || null,
        email_account_id: account.id,
        sent_by_name: user.full_name,
      });
    }

    return Response.json({ ok: true, gmail_message_id: sendResult.id, thread_id: sendResult.threadId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}