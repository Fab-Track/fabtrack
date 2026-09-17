// Unified per-org email sender via Resend.
// Reads the calling org's AppSettings record for Resend config.
// Used by the sendOrgEmail HTTP function and by server-side callers
// (e.g. approvePublicEstimate) that already hold a base44 client + orgId.

export const EMAIL_SETTING_KEY = 'email';

// Fetches the org's email config record (creates an empty stub if missing).
export async function getOrgEmailConfig(base44, orgId) {
  if (!orgId) return null;
  const records = await base44.asServiceRole.entities.AppSettings.filter({
    organization_id: orgId,
    setting_key: EMAIL_SETTING_KEY,
  });
  return records?.[0] || null;
}

// Returns true if the org has a usable Resend configuration.
export function isEmailConfigured(config) {
  return !!(
    config &&
    config.email_status === 'connected' &&
    config.resend_api_key &&
    config.resend_from_email
  );
}

// Sends an email through the org's Resend account.
// Returns { ok: true, id, from } on success,
//         { ok: false, error, code, status } on failure.
export async function sendOrgEmailViaResend(base44, orgId, { to, subject, html, text, replyTo }) {
  const config = await getOrgEmailConfig(base44, orgId);
  if (!isEmailConfigured(config)) {
    return {
      ok: false,
      code: 'email_not_configured',
      error: "Your company email isn't connected yet. Connect it in Settings → Integrations before sending estimates or invoices.",
      status: 403,
    };
  }

  const fromName = config.resend_from_name || 'FabTrack';
  const fromAddress = config.resend_from_email;
  const payload = {
    from: `${fromName} <${fromAddress}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
  };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (replyTo) payload.reply_to = replyTo;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resend_api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    return {
      ok: false,
      error: data?.message || 'Email send failed',
      status: 502,
    };
  }
  return { ok: true, id: data.id, from: payload.from };
}