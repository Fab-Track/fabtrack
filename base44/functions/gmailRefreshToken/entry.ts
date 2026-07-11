import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Refreshes an expired Gmail access token for system sender or a user.
// Called internally by sendGmail before sending.
// Body: { type: "system" } | { type: "user", employee_id: "..." }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth required — this endpoint returns live Gmail access tokens.
    const user = await base44.auth.me().catch(() => null);
    if (!user || !user.organization_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const callerRoles = [user.role, ...(user.roles || [])].filter(Boolean);
    const isAdmin = callerRoles.some(r => ['admin', 'owner', 'super_admin'].includes(r));

    const body = await req.json().catch(() => ({}));
    const { type, employee_id } = body;
    // Org scope always comes from the caller's own account, never the request body.
    const organization_id = user.organization_id;

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

    async function doRefresh(refreshToken) {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      return res.json();
    }

    if (type === 'system') {
      // Tenant isolation: never resolve the system sender without an org scope.
      if (!organization_id) return Response.json({ error: 'organization_id required.' }, { status: 400 });
      const records = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'gmail_system_sender', organization_id });
      if (!records.length) return Response.json({ error: 'System sender not configured.' }, { status: 404 });
      const rec = records[0];
      if (!rec.system_sender_refresh_token) {
        await base44.asServiceRole.entities.AppSettings.update(rec.id, { system_sender_status: 'expired' });
        return Response.json({ error: 'No refresh token — reconnect required.' }, { status: 401 });
      }
      const tokens = await doRefresh(rec.system_sender_refresh_token);
      if (tokens.error) {
        await base44.asServiceRole.entities.AppSettings.update(rec.id, { system_sender_status: 'expired' });
        return Response.json({ error: 'Refresh failed — reconnect required.', detail: tokens.error }, { status: 401 });
      }
      const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
      await base44.asServiceRole.entities.AppSettings.update(rec.id, {
        system_sender_access_token: tokens.access_token,
        system_sender_token_expiry: expiresAt,
        system_sender_status: 'connected',
      });
      return Response.json({ access_token: tokens.access_token, expires_at: expiresAt });
    } else {
      if (!employee_id) return Response.json({ error: 'employee_id required.' }, { status: 400 });
      const emps = await base44.asServiceRole.entities.Employee.filter({ id: employee_id, organization_id });
      if (!emps.length) return Response.json({ error: 'Employee not found.' }, { status: 404 });
      const emp = emps[0];
      // Caller must be this employee or an org admin/owner.
      const isSelf = emp.user_id === user.id || (emp.email && emp.email.toLowerCase() === (user.email || '').toLowerCase());
      if (!isSelf && !isAdmin) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!emp.gmail_refresh_token) {
        await base44.asServiceRole.entities.Employee.update(employee_id, { gmail_token_status: 'expired' });
        return Response.json({ error: 'No refresh token — reconnect required.' }, { status: 401 });
      }
      const tokens = await doRefresh(emp.gmail_refresh_token);
      if (tokens.error) {
        await base44.asServiceRole.entities.Employee.update(employee_id, { gmail_token_status: 'expired' });
        return Response.json({ error: 'Refresh failed — reconnect required.', detail: tokens.error }, { status: 401 });
      }
      const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
      await base44.asServiceRole.entities.Employee.update(employee_id, {
        gmail_access_token: tokens.access_token,
        gmail_token_expiry: expiresAt,
        gmail_token_status: 'connected',
      });
      return Response.json({ access_token: tokens.access_token, expires_at: expiresAt });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});