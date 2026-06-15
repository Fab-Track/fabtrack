import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Starts the Google Calendar OAuth flow. Returns a redirect URL for the frontend to open.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'GOOGLE_OAUTH_CLIENT_ID not configured.' }, { status: 500 });

    const appId = Deno.env.get('BASE44_APP_ID');
    const redirectUri = `https://api.base44.com/api/apps/${appId}/functions/calendarOAuthCallback`;

    const state = JSON.stringify({ user_id: user.id });
    const stateB64 = btoa(state);

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