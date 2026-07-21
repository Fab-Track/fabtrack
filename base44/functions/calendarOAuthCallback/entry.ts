import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// HMAC-SHA256 signature (hex) — must match the signature created by calendarOAuthStart.
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Handles the OAuth callback from Google Calendar authorization.
// Exchanges the code for tokens and stores them on the Employee entity.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse callback URL params
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateB64 = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(
        `<html><body><script>window.close();</script><p>Authorization failed: ${error}. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !stateB64) {
      return new Response(
        '<html><body><script>window.close();</script><p>Missing parameters. You can close this window.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

    // Verify the HMAC-signed state before trusting anything inside it.
    // State format: base64(json) + "." + hmacHex — created by calendarOAuthStart.
    let state = null;
    if (clientSecret) {
      const dotIdx = stateB64.indexOf('.');
      if (dotIdx > 0) {
        const data = stateB64.slice(0, dotIdx);
        const sig = stateB64.slice(dotIdx + 1);
        const expected = await hmacHex(clientSecret, data);
        if (sig === expected) {
          try { state = JSON.parse(atob(data)); } catch { /* invalid */ }
        }
      }
    }
    if (!state) {
      return new Response(
        '<html><body><script>window.close();</script><p>Invalid or tampered state. Please restart the connection from Settings. You can close this window.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!clientId || !clientSecret) {
      return new Response(
        '<html><body><script>window.close();</script><p>OAuth not configured. You can close this window.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const appId = Deno.env.get('BASE44_APP_ID');
    const redirectUri = `https://fab-track.base44.app/functions/calendarOAuthCallback`;

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

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      console.error('Token exchange failed:', tokenData);
      return new Response(
        `<html><body><script>window.close();</script><p>Token exchange failed. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get user info to determine the connected email
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // Find the employee record matching the current user
    const employees = await base44.asServiceRole.entities.Employee.filter({
      $or: [
        { email: state.user_id },
        { personal_email: state.user_id },
        { created_by_id: state.user_id },
      ]
    });

    if (employees.length === 0) {
      // Try matching by email from user info
      const byEmail = await base44.asServiceRole.entities.Employee.filter({
        $or: [
          { email: userInfo.email },
          { personal_email: userInfo.email },
        ]
      });
      
      if (byEmail.length === 0) {
        console.error('No employee found for user:', state.user_id, 'or email:', userInfo.email);
        return new Response(
          '<html><body><script>window.close();</script><p>No employee profile found. Contact your admin. You can close this window.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      
      // Update the found employee
      await base44.asServiceRole.entities.Employee.update(byEmail[0].id, {
        calendar_connected: true,
        calendar_connected_at: new Date().toISOString(),
        calendar_connected_email: userInfo.email,
        calendar_access_token: tokenData.access_token,
        calendar_refresh_token: tokenData.refresh_token || '',
        calendar_token_expiry: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
      });
    } else {
      await base44.asServiceRole.entities.Employee.update(employees[0].id, {
        calendar_connected: true,
        calendar_connected_at: new Date().toISOString(),
        calendar_connected_email: userInfo.email,
        calendar_access_token: tokenData.access_token,
        calendar_refresh_token: tokenData.refresh_token || '',
        calendar_token_expiry: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
      });
    }

    return new Response(
      '<html><body><script>window.close();</script><p>Calendar connected! You can close this window.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('calendarOAuthCallback error:', error.message);
    return new Response(
      `<html><body><script>window.close();</script><p>Error: ${error.message}. You can close this window.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});