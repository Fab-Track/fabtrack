import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// HMAC-SHA256 signature (hex) so the OAuth state can't be tampered with client-side.
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Starts the Google Calendar OAuth flow. Returns a redirect URL for the frontend to open.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    if (!clientId || !clientSecret) return Response.json({ error: 'OAuth credentials not configured.' }, { status: 500 });

    const appId = Deno.env.get('BASE44_APP_ID');
    const redirectUri = `https://api.base44.com/api/apps/${appId}/functions/calendarOAuthCallback`;

    const state = JSON.stringify({ user_id: user.id });
    const stateData = btoa(state);
    const stateB64 = `${stateData}.${await hmacHex(clientSecret, stateData)}`;

    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: stateB64,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return Response.json({ auth_url: authUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});