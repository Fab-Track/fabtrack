import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// The OAuth flow opens in a new tab; the Settings page polls for the result,
// so the callback just renders a simple close-this-tab page.
function buildReturnUrl(type, result, message) {
  return { result, message };
}

function redirectTo({ result, message }) {
  const ok = result === 'success';
  const safeMsg = String(message || '').replace(/</g, '&lt;');
  return new Response(
    `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc">
      <div style="text-align:center;max-width:420px">
        <div style="font-size:40px">${ok ? '✅' : '⚠️'}</div>
        <h2 style="margin:8px 0">${ok ? 'Email Connected' : 'Connection Failed'}</h2>
        <p style="color:#475569">${safeMsg}</p>
        <p style="color:#94a3b8;font-size:13px">You can close this tab and return to FabTrack.</p>
      </div>
      <script>setTimeout(function(){ window.close(); }, 4000);</script>
    </body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html' } }
  );
}

// HMAC-SHA256 signature (hex) — must match the signature created by gmailOAuthStart.
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateB64 = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const appId = Deno.env.get('BASE44_APP_ID');
  const redirectUri = `https://fab-track.base44.app/functions/gmailOAuthCallback`;

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

  // Verify the HMAC-signed state before trusting anything inside it.
  // State format: base64(json) + "." + hmacHex — created by gmailOAuthStart.
  let state = { type: 'system' };
  let stateValid = false;
  if (stateB64 && clientSecret) {
    const dotIdx = stateB64.indexOf('.');
    if (dotIdx > 0) {
      const data = stateB64.slice(0, dotIdx);
      const sig = stateB64.slice(dotIdx + 1);
      const expected = await hmacHex(clientSecret, data);
      if (sig === expected) {
        try {
          state = JSON.parse(atob(data));
          stateValid = true;
        } catch { /* invalid */ }
      }
    }
  }

  if (errorParam) {
    return redirectTo(buildReturnUrl(state.type, 'error', `Authorization cancelled: ${errorParam}`));
  }

  if (!clientId || !clientSecret) {
    return redirectTo(buildReturnUrl(state.type, 'error', 'OAuth credentials not configured on the server.'));
  }

  if (!code || !stateB64) {
    return redirectTo(buildReturnUrl(state.type, 'error', 'Missing authorization code.'));
  }

  if (!stateValid) {
    return redirectTo(buildReturnUrl('system', 'error', 'Invalid or tampered authorization state. Please restart the connection from Settings.'));
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

    if (!authorizedEmail) {
      return redirectTo(buildReturnUrl(state.type, 'error', 'Could not determine the authorized email address. Please try again.'));
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
    const base44 = createClientFromRequest(req);

    if (state.type === 'system') {
      // Tenant isolation: the system sender connection lives on the org's own AppSettings record.
      if (!state.org_id) {
        return redirectTo(buildReturnUrl('system', 'error', 'Missing organization scope — please restart the connection from Settings.'));
      }
      const existing = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'gmail_system_sender', organization_id: state.org_id });
      const tokenData = {
        setting_key: 'gmail_system_sender',
        organization_id: state.org_id,
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