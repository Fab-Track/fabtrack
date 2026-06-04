import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Disconnects a Gmail connection.
// Body: { type: "system" } | { type: "user", employee_id: "..." }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, employee_id } = await req.json().catch(() => ({}));

    if (type === 'system') {
      if (user.role !== 'admin') return Response.json({ error: 'Owners only.' }, { status: 403 });
      const records = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'gmail_system_sender' });
      if (records.length) {
        await base44.asServiceRole.entities.AppSettings.update(records[0].id, {
          system_sender_access_token: null,
          system_sender_refresh_token: null,
          system_sender_token_expiry: null,
          system_sender_status: 'disconnected',
        });
      }
      return Response.json({ ok: true });
    } else {
      const empId = employee_id;
      if (!empId) return Response.json({ error: 'employee_id required.' }, { status: 400 });
      await base44.asServiceRole.entities.Employee.update(empId, {
        gmail_connected: false,
        gmail_token_status: 'disconnected',
        gmail_access_token: null,
        gmail_refresh_token: null,
        gmail_token_expiry: null,
        gmail_connected_email: null,
      });
      return Response.json({ ok: true });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});