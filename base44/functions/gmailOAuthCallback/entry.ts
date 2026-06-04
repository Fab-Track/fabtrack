import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_DOMAIN = 'highcountrymetalworks.com';

// Handles Google OAuth redirect. Exchanges code for tokens, validates domain, stores tokens.
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateB64 = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const appId = Deno.env.get('BASE44_APP_ID');
  const redirectUri = `https://api.base44.com/api/apps/${appId}/functions/gmailOAuthCallback`;

  // Close window HTML helper
  function closeWindow(message, isError = false) {
    const color = isError ? '#dc2626' : '#16a34a';
    return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;text-align:center;">
      <p style="color:${color};font-size:1rem;">${message}</p>
      <script>
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({ type: 'gmail_oauth_${isError ? 'error' : 'success'}', message: '${message.replace(/'/g, "\\'")}' }, '*');
          }
          window.close();
        }, 1500);
      </script>
    </body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  if (errorParam) {
    return closeWindow(`Authorization cancelled: ${errorParam}`, true);
  }

  if (!code || !stateB64) {
    return closeWindow('Missing authorization code or state.', true);
  }

  let state;
  try {
    state = JSON.parse(atob(stateB64));
  } catch {
    return closeWindow('Invalid state parameter.', true);
  }

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return closeWindow('OAuth credentials not configured on the server.', true);
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
      return closeWindow(`Token exchange failed: ${tokens.error_description || tokens.error}`, true);
    }

    // Get the authorized email via userinfo
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userinfo = await userinfoRes.json();
    const authorizedEmail = userinfo.email || '';

    // Validate domain
    if (!authorizedEmail.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return closeWindow(
        `Only @${ALLOWED_DOMAIN} accounts can be connected. You authorized ${authorizedEmail} — please try again with your company account.`,
        true
      );
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    // Use service role to store tokens
    const base44 = createClientFromRequest(req);

    if (state.type === 'system') {
      // Store as app settings on a dedicated AppSettings record
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
      return closeWindow(`System sender connected as ${authorizedEmail} ✓`);
    } else {
      // Per-user: update the Employee record matching the user
      const empId = state.employee_id;
      if (!empId) return closeWindow('No employee ID in state.', true);

      await base44.asServiceRole.entities.Employee.update(empId, {
        gmail_connected: true,
        gmail_connected_at: new Date().toISOString(),
        gmail_token_status: 'connected',
        gmail_connected_email: authorizedEmail,
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token || null,
        gmail_token_expiry: expiresAt,
      });
      return closeWindow(`Gmail connected as ${authorizedEmail} ✓`);
    }
  } catch (err) {
    return closeWindow(`Server error: ${err.message}`, true);
  }
});