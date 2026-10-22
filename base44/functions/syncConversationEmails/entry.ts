import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  ensureValidToken,
  listGmailMessages,
  getGmailMessage,
  parseMessageHeaders,
  extractEmails,
  extractDisplayName,
  extractMessageBody,
} from '../../shared/gmail.js';

// Syncs emails from connected conversation EmailAccounts into CommMessage records.
// Deduplicates by gmail_message_id. Matches to customers by email address.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { account_id } = body;

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'OAuth credentials not configured.' }, { status: 500 });
    }

    // Get accounts to sync — either a specific one or all connected accounts in the org
    let accounts = [];
    if (account_id) {
      const acct = await base44.asServiceRole.entities.EmailAccount.get(account_id).catch(() => null);
      if (!acct || acct.organization_id !== user.organization_id) {
        return Response.json({ error: 'Account not found' }, { status: 404 });
      }
      accounts = [acct];
    } else {
      const { items } = await base44.asServiceRole.entities.EmailAccount.filter(
        { organization_id: user.organization_id, status: 'connected' },
        { limit: 50 }
      );
      accounts = items || [];
    }

    if (accounts.length === 0) {
      return Response.json({ ok: true, synced: 0, message: 'No connected accounts to sync.' });
    }

    // Load all customers for this org (for email matching)
    const { items: customers } = await base44.asServiceRole.entities.Customer.filter(
      { organization_id: user.organization_id },
      { limit: 500 }
    );

    // Build email → customer lookup
    const emailToCustomer = {};
    for (const c of customers) {
      if (c.email) emailToCustomer[c.email.toLowerCase().trim()] = c;
      if (c.job_contact_email) emailToCustomer[c.job_contact_email.toLowerCase().trim()] = c;
      if (c.billing_contact_email) emailToCustomer[c.billing_contact_email.toLowerCase().trim()] = c;
    }

    let totalSynced = 0;
    const results = [];

    for (const account of accounts) {
      try {
        // Refresh token if needed
        const tokenInfo = await ensureValidToken(account, clientId, clientSecret);

        // Update tokens if they were refreshed
        if (tokenInfo.access_token !== account.access_token && tokenInfo.expiry) {
          await base44.asServiceRole.entities.EmailAccount.update(account.id, {
            access_token: tokenInfo.access_token,
            token_expiry: tokenInfo.expiry,
          });
        }

        // Determine sync start time — last sync or 7 days ago
        const lastSync = account.last_sync_at ? new Date(account.last_sync_at).getTime() : 0;
        const afterTimestamp = lastSync || (Date.now() - 7 * 24 * 60 * 60 * 1000);

        // List messages since last sync
        const messageList = await listGmailMessages(tokenInfo.access_token, afterTimestamp);

        // Fetch full details for each message (batch of 6)
        let accountSynced = 0;
        for (let i = 0; i < messageList.length; i += 6) {
          const batch = messageList.slice(i, i + 6);
          const settled = await Promise.allSettled(
            batch.map(msg => getGmailMessage(tokenInfo.access_token, msg.id))
          );

          for (let j = 0; j < settled.length; j++) {
            const result = settled[j];
            if (result.status !== 'fulfilled') continue;
            const msg = result.value;

            // Dedup: skip if we already have this message
            if (msg.id) {
              const existing = await base44.asServiceRole.entities.CommMessage.filter(
                { gmail_message_id: msg.id, organization_id: user.organization_id },
                { limit: 1 }
              );
              if (existing.items && existing.items.length > 0) continue;
            }

            const headers = parseMessageHeaders(msg.payload?.headers);
            const fromEmails = extractEmails(headers.from);
            const toEmails = extractEmails(headers.to);
            const allEmails = [...fromEmails, ...toEmails];

            // Match to customer
            let matchedCustomer = null;
            for (const email of allEmails) {
              if (emailToCustomer[email]) {
                matchedCustomer = emailToCustomer[email];
                break;
              }
            }

            // Skip if no customer match and not from our own account
            const isFromOurAccount = fromEmails.includes(account.email.toLowerCase());
            const isToOurAccount = toEmails.includes(account.email.toLowerCase());
            if (!matchedCustomer && !isFromOurAccount && !isToOurAccount) continue;

            // Determine direction
            const direction = isFromOurAccount ? 'outbound' : 'inbound';

            // Extract body
            const bodyText = extractMessageBody(msg.payload) || msg.snippet || '';

            // Determine the other party (customer side)
            const otherEmails = direction === 'outbound' ? toEmails : fromEmails;
            const otherEmail = otherEmails[0] || '';
            const otherName = direction === 'outbound'
              ? extractDisplayName(headers.to)
              : extractDisplayName(headers.from);

            await base44.asServiceRole.entities.CommMessage.create({
              organization_id: user.organization_id,
              customer_id: matchedCustomer?.id || null,
              customer_name: matchedCustomer?.name || null,
              channel: 'Email',
              direction,
              status: 'sent',
              from_name: direction === 'outbound' ? account.display_name : (extractDisplayName(headers.from) || otherName),
              from_email: fromEmails[0] || account.email,
              to_name: direction === 'outbound' ? (extractDisplayName(headers.to) || otherName) : account.display_name,
              to_email: toEmails[0] || otherEmail,
              subject: headers.subject || '(no subject)',
              body: bodyText,
              sent_at: headers.date ? new Date(headers.date).toISOString() : new Date(parseInt(msg.internalDate)).toISOString(),
              gmail_message_id: msg.id,
              gmail_thread_id: msg.threadId || null,
              email_account_id: account.id,
            });
            accountSynced++;
            totalSynced++;
          }
        }

        // Update sync state
        await base44.asServiceRole.entities.EmailAccount.update(account.id, {
          last_sync_at: new Date().toISOString(),
          sync_error: null,
        });

        results.push({ account: account.email, synced: accountSynced, ok: true });
      } catch (err) {
        // Mark account with error but continue to next account
        await base44.asServiceRole.entities.EmailAccount.update(account.id, {
          sync_error: err.message,
        }).catch(() => {});
        results.push({ account: account.email, synced: 0, ok: false, error: err.message });
      }
    }

    return Response.json({ ok: true, synced: totalSynced, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}