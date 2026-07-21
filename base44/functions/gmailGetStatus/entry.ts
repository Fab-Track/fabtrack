import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns Gmail connection status for system sender and optionally a specific employee.
// Body: { employee_id?: string }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { employee_id } = await req.json().catch(() => ({}));
    if (!user.organization_id) {
      return Response.json({ system_sender: { status: 'disconnected', email: null, connected_at: null }, user_connection: null });
    }

    // System sender status — scoped to the caller's organization only
    const sysRecords = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'gmail_system_sender', organization_id: user.organization_id });
    const sys = sysRecords[0] || null;
    const systemSender = sys ? {
      email: sys.system_sender_email,
      status: sys.system_sender_status || 'disconnected',
      connected_at: sys.system_sender_connected_at || null,
    } : { status: 'disconnected', email: null, connected_at: null };

    // Per-user status
    let userConnection = null;
    if (employee_id) {
      const emps = await base44.asServiceRole.entities.Employee.filter({ id: employee_id, organization_id: user.organization_id });
      if (emps.length) {
        const e = emps[0];
        userConnection = {
          employee_id: e.id,
          email: e.gmail_connected_email || e.assigned_comm_email,
          status: e.gmail_token_status || 'disconnected',
          connected_at: e.gmail_connected_at || null,
          connected: !!e.gmail_connected,
        };
      }
    }

    return Response.json({ system_sender: systemSender, user_connection: userConnection });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});