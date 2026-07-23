import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Updates an employee's name and syncs to the linked User account.
// Also supports self-update (no employee_id) for the My Account page.
// User.full_name is a built-in field that can't be overridden via updateMe or
// client-side User.update (RLS blocks it), so this function runs as service role.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { employee_id, full_name } = await req.json();
    const name = (full_name || '').trim();
    if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

    // --- Self-update (My Account page) ---
    if (!employee_id) {
      await base44.asServiceRole.entities.User.update(user.id, { full_name: name });

      // Sync linked Employee record if one exists for this user
      const employees = await base44.asServiceRole.entities.Employee.filter({ user_id: user.id });
      if (employees.length > 0 && employees[0].name !== name) {
        await base44.asServiceRole.entities.Employee.update(employees[0].id, { name });
      }

      return Response.json({ success: true, full_name: name });
    }

    // --- Admin updating an employee ---
    const callerRoles = (user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : []))
      .map(r => (r || '').toLowerCase());
    const isAdmin = callerRoles.includes('owner') || callerRoles.includes('admin') || callerRoles.includes('super_admin');
    if (!isAdmin) {
      return Response.json({ error: 'Only owners/admins can edit employee names' }, { status: 403 });
    }
    if (!user.organization_id) {
      return Response.json({ error: 'No organization on your account' }, { status: 400 });
    }

    // Get the employee and verify org match
    const employee = await base44.asServiceRole.entities.Employee.get(employee_id).catch(() => null);
    if (!employee || employee.organization_id !== user.organization_id) {
      return Response.json({ error: 'Employee not found in your organization' }, { status: 404 });
    }

    // Update the Employee record
    await base44.asServiceRole.entities.Employee.update(employee_id, { name });

    // If linked to a User, sync their full_name too
    if (employee.user_id) {
      const linkedUser = await base44.asServiceRole.entities.User.get(employee.user_id).catch(() => null);
      if (linkedUser && linkedUser.organization_id === user.organization_id) {
        await base44.asServiceRole.entities.User.update(employee.user_id, { full_name: name });
      }
    }

    return Response.json({ success: true, full_name: name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});