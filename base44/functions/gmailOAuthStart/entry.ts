import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// HMAC-SHA256 signature (hex) so the OAuth state can't be tampered with client-side.
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Starts the Gmail OAuth flow. Returns a redirect URL for the frontend to open.
// Query params: type = "system" | "user", employee_id (for user type)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { type = 'user', employee_id } = body;

    if (!user.organization_id) {
      return Response.json({ error: 'Your account is not linked to an organization.' }, { status: 403 });
    }
    const callerRoles = [user.role, ...(user.roles || [])].filter(Boolean).map(r => String(r).toLowerCase());
    const isAdmin = callerRoles.some(r => ['admin', 'owner', 'super_admin'].includes(r));

    // Only owners/admins can connect the org's system sender
    if (type === 'system' && !isAdmin) {
      return Response.json({ error: 'Only owners can connect the system sender.' }, { status: 403 });
    }

    // For per-user connections, verify the caller is allowed to connect this employee's Gmail
    if (type !== 'system') {
      if (!employee_id) return Response.json({ error: 'employee_id required.' }, { status: 400 });
      const emp = await base44.asServiceRole.entities.Employee.get(employee_id).catch(() => null);
      if (!emp || emp.organization_id !== user.organization_id) {
        return Response.json({ error: 'Employee not found in your organization.' }, { status: 403 });
      }
      const isSelf = emp.user_id === user.id ||
        (emp.email && user.email && emp.email.toLowerCase() === user.email.toLowerCase());
      if (!isAdmin && !isSelf) {
        return Response.json({ error: 'You can only connect your own Gmail account.' }, { status: 403 });
      }
    }

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    if (!clientId || !clientSecret) return Response.json({ error: 'OAuth credentials not configured.' }, { status: 500 });

    const appId = Deno.env.get('BASE44_APP_ID');
    const redirectUri = `https://api.base44.com/api/apps/${appId}/functions/gmailOAuthCallback`;

    const state = JSON.stringify({ type, employee_id: employee_id || null, user_id: user.id, org_id: user.organization_id });
    const stateData = btoa(state);
    const stateB64 = `${stateData}.${await hmacHex(clientSecret, stateData)}`;

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