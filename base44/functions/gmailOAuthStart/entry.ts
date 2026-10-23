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
    const { type = 'user', employee_id, account_type, employee_name } = body;

    if (!user.organization_id) {
      return Response.json({ error: 'Your account is not linked to an organization.' }, { status: 403 });
    }
    const callerRoles = [user.role, ...(user.roles || [])].filter(Boolean).map(r => String(r).toLowerCase());
    const isAdmin = callerRoles.some(r => ['admin', 'owner', 'super_admin'].includes(r));

    // Only owners/admins can connect the org's system sender
    if (type === 'system' && !isAdmin) {
      return Response.json({ error: 'Only owners can connect the system sender.' }, { status: 403 });
    }

    // Conversation email accounts (shared inbox or employee)
    if (type === 'conversation') {
      const acctType = account_type || 'shared';
      if (acctType === 'shared' && !isAdmin) {
        return Response.json({ error: 'Only owners/admins can connect a shared conversation inbox.' }, { status: 403 });
      }
      if (acctType === 'employee') {
        // Resolve the target employee: use the provided ID, or fall back to the
        // caller's own employee record (matched by email or user_id).
        let emp = employee_id
          ? await base44.asServiceRole.entities.Employee.get(employee_id).catch(() => null)
          : await base44.asServiceRole.entities.Employee.filter({
              organization_id: user.organization_id,
              email: user.email,
            }).then(r => r[0] || null).catch(() => null);
        if (!emp || emp.organization_id !== user.organization_id) {
          return Response.json({ error: 'Employee not found in your organization.' }, { status: 403 });
        }
        const isSelf = emp.user_id === user.id ||
          (emp.email && user.email && emp.email.toLowerCase() === user.email.toLowerCase());
        if (!isAdmin && !isSelf) {
          return Response.json({ error: 'You can only connect your own Gmail account.' }, { status: 403 });
        }
        // Admins/owners can always connect. Non-admins need individual_email_enabled.
        if (!isAdmin && !emp.individual_email_enabled) {
          return Response.json({
            error: 'Individual email access is not enabled for your account. Ask an admin to enable it in Settings > Integrations.',
          }, { status: 403 });
        }
      }
    }

    // For per-user connections (legacy estimate sender), verify the caller is allowed
    if (type === 'user') {
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
    const redirectUri = `https://fab-track.base44.app/functions/gmailOAuthCallback`;

    // For employee conversation accounts, auto-resolve the employee_id if not provided
    let resolvedEmployeeId = employee_id || null;
    let resolvedEmployeeName = employee_name || null;
    if (type === 'conversation' && account_type === 'employee' && !resolvedEmployeeId) {
      const myEmp = await base44.asServiceRole.entities.Employee.filter({
        organization_id: user.organization_id,
        email: user.email,
      }).then(r => r[0] || null).catch(() => null);
      if (myEmp) {
        resolvedEmployeeId = myEmp.id;
        resolvedEmployeeName = myEmp.preferred_name || myEmp.name;
      }
    }
    const state = JSON.stringify({ type, employee_id: resolvedEmployeeId, user_id: user.id, org_id: user.organization_id, account_type: account_type || null, employee_name: resolvedEmployeeName });
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