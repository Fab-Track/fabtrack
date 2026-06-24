import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Scheduled function — runs every 15 minutes.
 * Finds active TimeEntry records that have been clocked in for more than 12
 * consecutive hours, auto-clocks them out at the 12-hour mark, and flags them
 * for admin review. Employees with unresolved flags cannot clock in again.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const activeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ is_active: true });

    const flaggedIds = [];
    const flaggedByOrg = {};

    for (const entry of activeEntries) {
      if (!entry.clock_in) continue;
      const clockIn = new Date(entry.clock_in);
      if (clockIn > twelveHoursAgo) continue;

      // Auto-clock-out at exactly the 12-hour mark
      const twelveHourMark = new Date(clockIn.getTime() + 12 * 60 * 60 * 1000);

      // Accumulate break time if currently on break
      let totalBreakMins = entry.break_minutes || 0;
      if (entry.is_on_break && entry.break_start) {
        totalBreakMins += Math.round((twelveHourMark - new Date(entry.break_start)) / 60000);
      }

      const durationMs = twelveHourMark - clockIn;
      const durationHours = durationMs / (1000 * 60 * 60);
      const netHours = (durationMs - totalBreakMins * 60000) / (1000 * 60 * 60);

      await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
        clock_out: twelveHourMark.toISOString(),
        duration_hours: Math.round(durationHours * 100) / 100,
        net_hours: Math.round(netHours * 100) / 100,
        break_minutes: totalBreakMins,
        is_active: false,
        is_on_break: false,
        break_start: null,
        is_flagged: true,
        flagged_reason: 'Auto-flagged: exceeded 12 consecutive hours without clocking out',
        flagged_at: now.toISOString(),
      });

      flaggedIds.push(entry.id);
      if (entry.organization_id) {
        if (!flaggedByOrg[entry.organization_id]) flaggedByOrg[entry.organization_id] = [];
        flaggedByOrg[entry.organization_id].push(entry.employee_name || 'Unknown');
      }
    }

    // Send in-app notifications to admins (best-effort)
    if (flaggedIds.length > 0) {
      try {
        for (const [orgId, names] of Object.entries(flaggedByOrg)) {
          const users = await base44.asServiceRole.entities.User.filter({ organization_id: orgId });
          const adminUsers = users.filter(u => {
            const r = u.roles || (u.role ? [u.role] : []);
            return r.some(role =>
              ['owner', 'admin', 'shop_manager', 'foreman', 'payroll'].includes(role.toLowerCase())
            );
          });

          for (const admin of adminUsers) {
            await base44.asServiceRole.entities.Notification.create({
              organization_id: orgId,
              user_id: admin.id,
              title: 'Time Card Auto-Flagged',
              message: `${flaggedIds.length} time card entry(ies) exceeded 12 hours and were auto-flagged. Affected: ${names.join(', ')}. Please review and resolve.`,
              type: 'time_card_flagged',
              is_read: false,
            });
          }
        }
      } catch (notifErr) {
        // Notifications are optional — don't fail the function
        console.log('Notification creation skipped:', notifErr.message);
      }
    }

    return Response.json({ flagged: flaggedIds.length, entries: flaggedIds });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});