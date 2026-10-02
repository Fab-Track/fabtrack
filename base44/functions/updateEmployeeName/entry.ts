import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Updates a user's name. User.full_name is a built-in read-only field that the
// platform silently ignores on update, so the name is persisted on the linked
// Employee record. If no Employee record exists yet, one is created so the name
// has somewhere to live. Also attempts the User.full_name update in case the
// platform allows it in some contexts (no-op if it doesn't).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { employee_id, target_user_id, full_name } = await req.json();
    const name = (full_name || '').trim();
    if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

    // --- Self-update (My Account page) ---
    if (!employee_id && !target_user_id) {
      await base44.asServiceRole.entities.User.update(user.id, { full_name: name });

      // Find or create a linked Employee record
      const employees = await base44.asServiceRole.entities.Employee.filter({ user_id: user.id });
      if (employees.length > 0) {
        if (employees[0].name !== name) {
          await base44.asServiceRole.entities.Employee.update(employees[0].id, { name });
        }
      } else {
        await base44.asServiceRole.entities.Employee.create({
          name,
          user_id: user.id,
          organization_id: user.organization_id,
          email: user.email,
        });
      }

      return Response.json({ success: true, full_name: name });
    }

    // --- Admin updating an employee ---
    const callerRoles = (user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : []))
      .map(r => (r || '').toLowerCase());
    const isAdmin = callerRoles.includes('owner') || callerRoles.includes('admin') || callerRoles.includes('super_admin');
    if (!isAdmin) {
      return Response.json({ error: 'Only owners/admins can edit names' }, { status: 403 });
    }
    if (!user.organization_id) {
      return Response.json({ error: 'No organization on your account' }, { status: 400 });
    }

    // --- Admin updating a User directly (from Users & Roles page) ---
    if (target_user_id && !employee_id) {
      const targetUser = await base44.asServiceRole.entities.User.get(target_user_id).catch(() => null);
      if (!targetUser || targetUser.organization_id !== user.organization_id) {
        return Response.json({ error: 'User not found in your organization' }, { status: 404 });
      }
      await base44.asServiceRole.entities.User.update(target_user_id, { full_name: name });
      // Find or create a linked Employee record to persist the name
      const linkedEmployees = await base44.asServiceRole.entities.Employee.filter({ user_id: target_user_id });
      if (linkedEmployees.length > 0) {
        if (linkedEmployees[0].name !== name) {
          await base44.asServiceRole.entities.Employee.update(linkedEmployees[0].id, { name });
        }
      } else {
        await base44.asServiceRole.entities.Employee.create({
          name,
          user_id: target_user_id,
          organization_id: user.organization_id,
          email: targetUser.email,
        });
      }
      return Response.json({ success: true, full_name: name });
    }

    // --- Admin updating an Employee directly (from Employees page) ---
    const employee = await base44.asServiceRole.entities.Employee.get(employee_id).catch(() => null);
    if (!employee || employee.organization_id !== user.organization_id) {
      return Response.json({ error: 'Employee not found in your organization' }, { status: 404 });
    }

    await base44.asServiceRole.entities.Employee.update(employee_id, { name });

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