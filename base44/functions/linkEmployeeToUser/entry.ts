import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Links a pending Employee record to the current logged-in User by email.
 * Called automatically by the useCurrentEmployee hook when a user logs in
 * and has an Employee record with a matching email but no user_id yet.
 *
 * Also syncs the Employee's role to the User's roles array so that
 * sidebar navigation and permission guards work immediately.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'No email on user account' }, { status: 400 });

    // Find Employee by email that isn't yet linked to a user
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
    if (employees.length === 0) {
      return Response.json({ linked: false, reason: 'No matching employee record found' });
    }

    const emp = employees[0];

    // Already linked to a different user — don't overwrite
    if (emp.user_id && emp.user_id !== user.id) {
      return Response.json({ linked: false, reason: 'Employee already linked to another user' });
    }

    // Link the employee to this user
    const updated = await base44.asServiceRole.entities.Employee.update(emp.id, {
      user_id: user.id,
    });

    // Sync the Employee's role to the User's roles array
    if (emp.role) {
      // Get current user roles (may be array or single string)
      const currentRoles = user.roles || (user.role ? [user.role] : []);
      const normalizedRoles = currentRoles.map(r => r.toLowerCase());

      // Add the employee role if not already present
      if (!normalizedRoles.includes(emp.role.toLowerCase())) {
        const newRoles = [...currentRoles, emp.role];
        await base44.asServiceRole.entities.User.update(user.id, {
          roles: newRoles,
          role: emp.role, // legacy single-role field
        });
      }
    }

    return Response.json({
      linked: true,
      employee: {
        id: updated.id,
        name: updated.name,
        role: updated.role,
        user_id: updated.user_id,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});