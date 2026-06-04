import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_DOMAIN = 'highcountrymetalworks.com';

// The FabTrack app base URL — all redirects go here, never to the marketing site.
const APP_BASE_URL = 'https://app.base44.com/apps/6a0386c06686afe23a4a4b70';

// After OAuth, redirect back to the correct Settings page with result params.
// System sender → /settings?section=integrations&gmail_result=...
// Per-user      → /settings?section=account&gmail_result=...
function buildReturnUrl(type, result, message) {
  const section = type === 'system' ? 'integrations' : 'account';
  const params = new URLSearchParams({
    section,
    gmail_result: result,       // "success" | "error"
    gmail_message: message,
  });
  return `${APP_BASE_URL}?${params}`;
}

function redirectTo(url) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateB64 = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const appId = Deno.env.get('BASE44_APP_ID');
  const redirectUri = `https://api.base44.com/api/apps/${appId}/functions/gmailOAuthCallback`;

  // Decode state early so we know which page to return to on error
  let state = { type: 'system' };
  if (stateB64) {
    try { state = JSON.parse(atob(stateB64)); } catch { /* fallback to system */ }
  }

  if (errorParam) {
    return redirectTo(buildReturnUrl(state.type, 'error', `Authorization cancelled: ${errorParam}`));
  }

  if (!code || !stateB64) {
    return redirectTo(buildReturnUrl(state.type, 'error', 'Missing authorization code.'));
  }

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return redirectTo(buildReturnUrl(state.type, 'error', 'OAuth credentials not configured on the server.'));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      return redirectTo(buildReturnUrl(state.type, 'error',
        `Token exchange failed: ${tokens.error_description || tokens.error}`));
    }

    // Get the authorized email via userinfo
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userinfo = await userinfoRes.json();
    const authorizedEmail = userinfo.email || '';

    // Validate domain
    if (!authorizedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return redirectTo(buildReturnUrl(state.type, 'error',
        `Only @${ALLOWED_DOMAIN} accounts can be connected. You used ${authorizedEmail} — please sign in with your company account.`));
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
    const base44 = createClientFromRequest(req);

    if (state.type === 'system') {
      const existing = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'gmail_system_sender' });
      const tokenData = {
        setting_key: 'gmail_system_sender',
        system_sender_email: authorizedEmail,
        system_sender_access_token: tokens.access_token,
        system_sender_refresh_token: tokens.refresh_token || null,
        system_sender_token_expiry: expiresAt,
        system_sender_status: 'connected',
        system_sender_connected_at: new Date().toISOString(),
      };
      if (existing.length > 0) {
        await base44.asServiceRole.entities.AppSettings.update(existing[0].id, tokenData);
      } else {
        await base44.asServiceRole.entities.AppSettings.create(tokenData);
      }
      return redirectTo(buildReturnUrl('system', 'success', `System sender connected as ${authorizedEmail}`));

    } else {
      const empId = state.employee_id;
      if (!empId) {
        return redirectTo(buildReturnUrl('user', 'error', 'No employee ID in state.'));
      }
      await base44.asServiceRole.entities.Employee.update(empId, {
        gmail_connected: true,
        gmail_connected_at: new Date().toISOString(),
        gmail_token_status: 'connected',
        gmail_connected_email: authorizedEmail,
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token || null,
        gmail_token_expiry: expiresAt,
      });
      return redirectTo(buildReturnUrl('user', 'success', `Gmail connected as ${authorizedEmail}`));
    }

  } catch (err) {
    return redirectTo(buildReturnUrl(state.type, 'error', `Server error: ${err.message}`));
  }
});