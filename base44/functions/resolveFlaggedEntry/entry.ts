import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Allows an admin/manager to resolve a flagged time entry by setting a
 * corrected clock-out time, adding a resolution note, and marking it resolved.
 * Once resolved, the employee can clock in again normally.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const roles = user.roles || (user.role ? [user.role] : []);
    const normalizedRoles = roles.map(r => r.toLowerCase());
    const managerRoles = ['owner', 'admin', 'shop_manager', 'foreman', 'payroll'];
    const isManager = normalizedRoles.some(r => managerRoles.includes(r));
    if (!isManager) return Response.json({ error: 'Access denied — manager role required' }, { status: 403 });

    const body = await req.json();
    const { entry_id, clock_out, resolution_notes } = body;
    if (!entry_id || !clock_out) {
      return Response.json({ error: 'entry_id and clock_out are required' }, { status: 400 });
    }

    const entry = await base44.asServiceRole.entities.TimeEntry.get(entry_id).catch(() => null);
    if (!entry) return Response.json({ error: 'Entry not found' }, { status: 404 });

    // Tenant isolation: managers can only resolve entries in their own org
    if (!user.organization_id || entry.organization_id !== user.organization_id) {
      return Response.json({ error: 'Entry not found' }, { status: 404 });
    }

    const clockOutDate = new Date(clock_out);
    const clockIn = new Date(entry.clock_in);
    const breakMins = entry.break_minutes || 0;
    const durationMs = clockOutDate - clockIn;
    const durationHours = durationMs / (1000 * 60 * 60);
    const netHours = (durationMs - breakMins * 60000) / (1000 * 60 * 60);

    const updated = await base44.asServiceRole.entities.TimeEntry.update(entry_id, {
      clock_out: clock_out,
      duration_hours: Math.round(durationHours * 100) / 100,
      net_hours: Math.round(netHours * 100) / 100,
      is_active: false,
      is_on_break: false,
      break_start: null,
      is_flagged: false,
      is_resolved: true,
      resolved_by: user.id,
      resolved_by_name: user.full_name || user.email,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolution_notes || '',
      edited_by: user.id,
      edited_by_name: user.full_name || user.email,
      edited_at: new Date().toISOString(),
      edit_reason: 'Resolved flagged entry: ' + (resolution_notes || 'No note provided'),
    });

    return Response.json({ entry: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});