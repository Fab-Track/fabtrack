import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Starts the Gmail OAuth flow. Returns a redirect URL for the frontend to open.
// Query params: type = "system" | "user", employee_id (for user type)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { type = 'user', employee_id } = body;

    // Only owners can connect the system sender
    if (type === 'system' && user.role !== 'admin') {
      return Response.json({ error: 'Only owners can connect the system sender.' }, { status: 403 });
    }

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    if (!clientId) return Response.json({ error: 'GOOGLE_OAUTH_CLIENT_ID not configured.' }, { status: 500 });

    const appId = Deno.env.get('BASE44_APP_ID');
    const redirectUri = `https://api.base44.com/api/apps/${appId}/functions/gmailOAuthCallback`;

    const state = JSON.stringify({ type, employee_id: employee_id || null, user_id: user.id });
    const stateB64 = btoa(state);

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
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

    return Response.json({ auth_url: authUrl, redirect_uri: redirectUri });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});