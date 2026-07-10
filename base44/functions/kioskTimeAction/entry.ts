import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Kiosk Time Action — handles all clock in/out/break operations from the
 * public shop kiosk (no auth required; verifies employee via PIN).
 *
 * Actions:
 *   getStatus  — returns active entries (minimal data for kiosk display)
 *   clockIn    — creates a new TimeEntry (verifies PIN, checks for unresolved flags)
 *   clockOut   — finalises the active entry with clock_out + duration
 *   startBreak — pauses the active entry
 *   endBreak   — resumes the active entry, accumulates break minutes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── getStatus ──────────────────────────────────────────────────────────
    if (action === "getStatus") {
      // organization_id is mandatory — never allow a platform-wide query, which would
      // expose every org's active timecards to an unauthenticated caller.
      if (!body.organization_id) {
        return Response.json({ error: "organization_id required" }, { status: 400 });
      }
      const active = await base44.asServiceRole.entities.TimeEntry.filter({ is_active: true, organization_id: body.organization_id });
      const activeEntries = active.map(e => ({
        employee_id: e.employee_id,
        entry_id: e.id,
        is_on_break: e.is_on_break,
        clock_in: e.clock_in,
        job_number: e.job_number,
        work_center: e.work_center,
        break_minutes: e.break_minutes || 0,
        break_start: e.break_start,
      }));
      return Response.json({ activeEntries });
    }

    // ── clockIn — verify employee + PIN ─────────────────────────────────────
    if (action === "clockIn") {
      const employee = await base44.asServiceRole.entities.Employee.get(body.employee_id);
      if (!employee) return Response.json({ error: "Employee not found" }, { status: 404 });
      if (employee.pin && body.pin !== employee.pin) {
        return Response.json({ error: "Invalid PIN" }, { status: 403 });
      }

      // Block if employee has an unresolved flagged entry
      const flagged = await base44.asServiceRole.entities.TimeEntry.filter({
        employee_id: body.employee_id,
        is_flagged: true,
        is_resolved: false,
      });
      if (flagged.length > 0) {
        return Response.json({
          error: "You have a flagged time entry that needs admin review. Please contact your manager before clocking in again.",
        }, { status: 403 });
      }

      const entry = await base44.asServiceRole.entities.TimeEntry.create({
        employee_id: body.employee_id,
        employee_name: employee.name,
        employee_email: employee.email || "",
        job_id: body.job_id || null,
        job_number: body.job_number || "",
        work_center: body.work_center || "General",
        organization_id: employee.organization_id,
        entry_type: "shift",
        clock_in: new Date().toISOString(),
        is_active: true,
        is_on_break: false,
        break_minutes: 0,
        is_manual: false,
        is_flagged: false,
      });
      return Response.json({ entry });
    }

    // ── clockOut ────────────────────────────────────────────────────────────
    if (action === "clockOut") {
      const entry = await base44.asServiceRole.entities.TimeEntry.get(body.entry_id);
      if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });
      if (!entry.is_active) return Response.json({ error: "Entry already clocked out" }, { status: 400 });

      const now = new Date();
      const clockIn = new Date(entry.clock_in);

      // If currently on break, end the break and accumulate minutes
      let totalBreakMins = entry.break_minutes || 0;
      if (entry.is_on_break && entry.break_start) {
        totalBreakMins += Math.round((now - new Date(entry.break_start)) / 60000);
      }

      const durationMs = now - clockIn;
      const durationHours = durationMs / (1000 * 60 * 60);
      const netHours = (durationMs - totalBreakMins * 60000) / (1000 * 60 * 60);

      const updated = await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
        clock_out: now.toISOString(),
        duration_hours: Math.round(durationHours * 100) / 100,
        net_hours: Math.round(netHours * 100) / 100,
        break_minutes: totalBreakMins,
        is_active: false,
        is_on_break: false,
        break_start: null,
      });

      return Response.json({
        entry: updated,
        netHours: Math.round(netHours * 100) / 100,
        durationHours: Math.round(durationHours * 100) / 100,
        breakMinutes: totalBreakMins,
      });
    }

    // ── startBreak ──────────────────────────────────────────────────────────
    if (action === "startBreak") {
      const entry = await base44.asServiceRole.entities.TimeEntry.get(body.entry_id);
      if (!entry || !entry.is_active) return Response.json({ error: "No active entry" }, { status: 400 });
      if (entry.is_on_break) return Response.json({ error: "Already on break" }, { status: 400 });

      const updated = await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
        is_on_break: true,
        break_start: new Date().toISOString(),
      });
      return Response.json({ entry: updated });
    }

    // ── endBreak ────────────────────────────────────────────────────────────
    if (action === "endBreak") {
      const entry = await base44.asServiceRole.entities.TimeEntry.get(body.entry_id);
      if (!entry || !entry.is_active) return Response.json({ error: "No active entry" }, { status: 400 });
      if (!entry.is_on_break) return Response.json({ error: "Not on break" }, { status: 400 });

      const now = new Date();
      const breakStart = new Date(entry.break_start);
      const breakMins = Math.round((now - breakStart) / 60000);
      const totalBreakMins = (entry.break_minutes || 0) + breakMins;

      const updated = await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
        is_on_break: false,
        break_start: null,
        break_minutes: totalBreakMins,
      });
      return Response.json({ entry: updated, breakMinutes: breakMins });
    }

    return Response.json({ error: "Unknown action: " + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});