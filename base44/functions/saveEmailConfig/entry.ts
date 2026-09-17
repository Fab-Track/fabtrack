import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getOrgEmailConfig, EMAIL_SETTING_KEY } from '../../shared/email.js';

// Saves the org's Resend email config and optionally sends a test email.
// Body: {
//   action: 'save' | 'test',
//   resend_api_key?, resend_from_email?, resend_from_name?,
//   test_to?  (required when action='test')
// }
//
// 'save' — persists the config and marks status as 'connected' only if a test
//          email is sent successfully (when test_to is provided). Otherwise it
//          saves the credentials and marks 'disconnected' so the admin can test.
// 'test'  — sends a test email using the saved config (or the provided
//          credentials if they haven't been saved yet).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organization_id) {
      return Response.json({ error: 'No organization linked to your account' }, { status: 403 });
    }

    const orgId = user.organization_id;
    const body = await req.json();
    const { action = 'save', test_to } = body;

    // Resolve the org's business email for reply-to
    let orgEmail = null;
    try {
      const org = await base44.asServiceRole.entities.Organization.get(orgId);
      orgEmail = org?.email || null;
    } catch { /* non-fatal */ }

    let config = await getOrgEmailConfig(base44, orgId);

    if (action === 'save') {
      const updates = {
        organization_id: orgId,
        setting_key: EMAIL_SETTING_KEY,
        email_provider: 'resend',
      };
      if (body.resend_api_key !== undefined) updates.resend_api_key = body.resend_api_key;
      if (body.resend_from_email !== undefined) updates.resend_from_email = body.resend_from_email;
      if (body.resend_from_name !== undefined) updates.resend_from_name = body.resend_from_name;

      // If a test recipient is provided, validate by sending a real test email
      if (test_to) {
        const testResult = await sendTestEmail(
          updates.resend_api_key || config?.resend_api_key,
          updates.resend_from_email || config?.resend_from_email,
          updates.resend_from_name || config?.resend_from_name || user?.organization_name || 'FabTrack',
          test_to,
          orgEmail
        );
        if (!testResult.ok) {
          // Save the config but mark as error so the admin sees the issue
          if (config?.id) {
            await base44.asServiceRole.entities.AppSettings.update(config.id, {
              ...updates,
              email_status: 'error',
            });
          } else {
            await base44.asServiceRole.entities.AppSettings.create({
              ...updates,
              email_status: 'error',
            });
          }
          return Response.json({
            ok: false,
            error: testResult.error,
            code: 'test_failed',
          }, { status: 400 });
        }
        updates.email_status = 'connected';
        updates.email_connected_at = new Date().toISOString();
      } else {
        // No test requested — save credentials but keep as disconnected until tested
        if (!updates.resend_api_key || !updates.resend_from_email) {
          updates.email_status = 'disconnected';
        } else {
          updates.email_status = updates.email_status || 'connected';
        }
      }

      if (config?.id) {
        await base44.asServiceRole.entities.AppSettings.update(config.id, updates);
      } else {
        await base44.asServiceRole.entities.AppSettings.create(updates);
      }

      return Response.json({
        ok: true,
        email_status: updates.email_status,
      });
    }

    if (action === 'test') {
      if (!test_to) {
        return Response.json({ error: 'test_to is required for test action' }, { status: 400 });
      }
      const apiKey = body.resend_api_key || config?.resend_api_key;
      const fromEmail = body.resend_from_email || config?.resend_from_email;
      const fromName = body.resend_from_name || config?.resend_from_name || user?.organization_name || 'FabTrack';

      if (!apiKey || !fromEmail) {
        return Response.json({
          ok: false,
          error: 'Enter your Resend API key and from-email first.',
          code: 'not_configured',
        }, { status: 400 });
      }

      const testResult = await sendTestEmail(apiKey, fromEmail, fromName, test_to, orgEmail);
      if (!testResult.ok) {
        return Response.json({ ok: false, error: testResult.error }, { status: 400 });
      }

      // If this test used saved credentials, update the status to connected
      if (config?.id && !body.resend_api_key) {
        await base44.asServiceRole.entities.AppSettings.update(config.id, {
          email_status: 'connected',
          email_connected_at: new Date().toISOString(),
        });
      }

      return Response.json({ ok: true, message: 'Test email sent successfully.' });
    }

    return Response.json({ error: 'Unknown action. Use "save" or "test".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendTestEmail(apiKey, fromEmail, fromName, to, replyTo) {
  const payload = {
    from: `${fromName} <${fromEmail}>`,
    to: [to],
    subject: 'FabTrack Email Test — Connection Successful',
    html: `<p>This is a test email from FabTrack.</p><p>Your email integration is working correctly. Emails to customers will now be sent from <strong>${fromEmail}</strong>.</p>`,
    text: `This is a test email from FabTrack. Your email integration is working correctly. Emails to customers will now be sent from ${fromEmail}.`,
  };
  if (replyTo) payload.reply_to = replyTo;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    return { ok: false, error: data?.message || `Resend error (${resp.status})` };
  }
  return { ok: true, id: data.id };
}