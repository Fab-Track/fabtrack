import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ensureValidToken, buildRawEmail, sendGmailMessage } from '../../shared/gmail.js';

// Sends an email from a connected conversation EmailAccount via Gmail API.
// Body params: email_account_id, to_email, to_name, subject, body, from_name
export default async function(req) {
  let message_id: string | null = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    message_id = body.message_id || null;
    const { email_account_id, to_email, to_name, subject, body: messageBody, from_name } = body;

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

    // For employee accounts, verify the sender is authorized: admin/owner always,
    // otherwise the sender's Employee record must have individual_email_enabled.
    if (account.account_type === 'employee') {
      const callerRoles = [user.role, ...(user.roles || [])].filter(Boolean).map(r => String(r).toLowerCase());
      const isAdminCaller = callerRoles.some(r => ['admin', 'owner', 'super_admin'].includes(r));
      if (!isAdminCaller) {
        const senderEmp = await base44.asServiceRole.entities.Employee.filter({
          organization_id: user.organization_id,
          email: user.email,
        }).then(r => r[0] || null).catch(() => null);
        if (!senderEmp || !senderEmp.individual_email_enabled) {
          return Response.json({ error: 'Individual email access is not enabled for your account.' }, { status: 403 });
        }
      }
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
      toEmail: to_email,
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
    // Mark the CommMessage as failed so it's not stuck on a pre-set 'sent' status
    if (message_id) {
      try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (user) {
          const existing = await base44.asServiceRole.entities.CommMessage.get(message_id).catch(() => null);
          if (existing && existing.organization_id === user.organization_id) {
            await base44.asServiceRole.entities.CommMessage.update(message_id, {
              status: 'failed',
              error_message: error.message,
            });
          }
        }
      } catch { /* best-effort */ }
    }
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}