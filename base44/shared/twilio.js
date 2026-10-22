// Unified per-org Twilio SMS configuration.
// Reads the calling org's AppSettings record for Twilio credentials.
// Used by saveTwilioConfig, manageTwilioNumbers, and sendCustomerMessage.

export const TWILIO_SETTING_KEY = 'twilio';

// Fetches the org's Twilio config record (returns null if missing).
export async function getOrgTwilioConfig(base44, orgId) {
  if (!orgId) return null;
  const records = await base44.asServiceRole.entities.AppSettings.filter({
    organization_id: orgId,
    setting_key: TWILIO_SETTING_KEY,
  });
  return records?.[0] || null;
}

// Returns true if the org has a usable Twilio configuration.
export function isTwilioConfigured(config) {
  return !!(
    config &&
    config.twilio_status === 'connected' &&
    config.twilio_account_sid &&
    config.twilio_auth_token
  );
}

// Resolves Twilio credentials for the org, falling back to platform env vars
// during migration (so existing setups keep working until org-level config is saved).
// Returns { accountSid, authToken, fromNumber } or null.
export function resolveTwilioCredentials(config) {
  if (config && config.twilio_account_sid && config.twilio_auth_token) {
    return {
      accountSid: config.twilio_account_sid,
      authToken: config.twilio_auth_token,
      fromNumber: config.twilio_from_number || null,
    };
  }
  // Migration fallback: platform-level env vars
  const envSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (envSid && envToken) {
    return {
      accountSid: envSid,
      authToken: envToken,
      fromNumber: Deno.env.get('TWILIO_FROM_NUMBER') || null,
    };
  }
  return null;
}

// Sends an SMS via the org's Twilio credentials.
// Returns { ok: true, sid } on success, { ok: false, error } on failure.
export async function sendTwilioSms(credentials, to, body, fromOverride) {
  const from = fromOverride || credentials.fromNumber;
  if (!from) {
    return { ok: false, error: 'No from-number configured. Set a primary SMS number in Settings.' };
  }
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;
  const formData = new URLSearchParams({ To: to, From: from, Body: body });
  const resp = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${credentials.accountSid}:${credentials.authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  const data = await resp.json();
  if (resp.ok) return { ok: true, sid: data.sid };
  return { ok: false, error: data.message || 'Twilio error' };
}