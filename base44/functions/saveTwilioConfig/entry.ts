import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getOrgTwilioConfig, resolveTwilioCredentials, sendTwilioSms, TWILIO_SETTING_KEY } from '../../shared/twilio.js';

// Saves, tests, or disconnects the org's Twilio SMS configuration.
// Body: {
//   action: 'save' | 'test' | 'disconnect',
//   account_sid?, auth_token?, from_number?,  (save)
//   test_to?  (test)
// }
//
// 'save'       — persists credentials and marks status as 'connected'
// 'test'       — sends a test SMS using saved (or provided) credentials
// 'disconnect' — clears all Twilio credentials for this org

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organization_id) {
      return Response.json({ error: 'No organization linked to your account' }, { status: 403 });
    }

    const callerRoles = [user.role, ...(user.roles || [])].filter(Boolean).map(r => String(r).toLowerCase());
    const isAdmin = callerRoles.some(r => ['admin', 'owner', 'super_admin'].includes(r));
    if (!isAdmin) {
      return Response.json({ error: 'Only owners and admins can configure Twilio.' }, { status: 403 });
    }

    const orgId = user.organization_id;
    const body = await req.json();
    const { action = 'save', test_to } = body;

    let config = await getOrgTwilioConfig(base44, orgId);

    if (action === 'disconnect') {
      if (config?.id) {
        await base44.asServiceRole.entities.AppSettings.update(config.id, {
          twilio_account_sid: null,
          twilio_auth_token: null,
          twilio_from_number: null,
          twilio_status: 'disconnected',
          twilio_connected_at: null,
        });
      }
      return Response.json({ ok: true, twilio_status: 'disconnected' });
    }

    if (action === 'save') {
      const updates = {
        organization_id: orgId,
        setting_key: TWILIO_SETTING_KEY,
      };
      if (body.account_sid !== undefined) updates.twilio_account_sid = body.account_sid;
      if (body.auth_token !== undefined) updates.twilio_auth_token = body.auth_token;
      if (body.from_number !== undefined) updates.twilio_from_number = body.from_number;

      // Mark connected only if all three are present
      const sid = updates.twilio_account_sid ?? config?.twilio_account_sid;
      const token = updates.twilio_auth_token ?? config?.twilio_auth_token;
      const from = updates.twilio_from_number ?? config?.twilio_from_number;
      if (sid && token && from) {
        updates.twilio_status = 'connected';
        updates.twilio_connected_at = new Date().toISOString();
      } else {
        updates.twilio_status = 'disconnected';
      }

      if (config?.id) {
        await base44.asServiceRole.entities.AppSettings.update(config.id, updates);
      } else {
        await base44.asServiceRole.entities.AppSettings.create(updates);
      }
      return Response.json({ ok: true, twilio_status: updates.twilio_status });
    }

    if (action === 'test') {
      if (!test_to) {
        return Response.json({ error: 'test_to is required for test action' }, { status: 400 });
      }
      // Use provided credentials or fall back to saved config
      const sid = body.account_sid || config?.twilio_account_sid;
      const token = body.auth_token || config?.twilio_auth_token;
      const from = body.from_number || config?.twilio_from_number;

      if (!sid || !token) {
        return Response.json({
          ok: false,
          error: 'Enter your Twilio Account SID and Auth Token first.',
          code: 'not_configured',
        }, { status: 400 });
      }

      const result = await sendTwilioSms(
        { accountSid: sid, authToken: token, fromNumber: from },
        test_to,
        '✅ Test SMS from FabTrack — Twilio is connected!',
      );

      if (!result.ok) {
        // If using saved credentials, mark as error
        if (config?.id && !body.account_sid) {
          await base44.asServiceRole.entities.AppSettings.update(config.id, { twilio_status: 'error' });
        }
        return Response.json({ ok: false, error: result.error }, { status: 400 });
      }

      // If test used saved credentials, mark as connected
      if (config?.id && !body.account_sid) {
        await base44.asServiceRole.entities.AppSettings.update(config.id, {
          twilio_status: 'connected',
          twilio_connected_at: new Date().toISOString(),
        });
      }
      return Response.json({ ok: true, sid: result.sid });
    }

    return Response.json({ error: 'Unknown action. Use "save", "test", or "disconnect".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});