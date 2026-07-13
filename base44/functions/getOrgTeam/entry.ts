import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Server-side merged team roster for the caller's organization.
// Combines Employee, PendingInvite, and User records into one list,
// exposing only safe display fields (never PINs, 2FA secrets, lockout
// counters, or phone numbers).

function normEmail(e) {
  return (e || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // App-level role check — same pattern as inviteOrgUser
    const callerRoles = (user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])).map(r => (r || '').toLowerCase());
    const isOwnerOrAdmin = callerRoles.includes('owner') || callerRoles.includes('admin');
    if (!isOwnerOrAdmin) {
      return Response.json({ error: 'Only owners/admins can view the team roster' }, { status: 403 });
    }

    // Org derived from the caller only — never from the request body
    const organization_id = user.organization_id;
    if (!organization_id) {
      return Response.json({ error: 'No organization on your account' }, { status: 400 });
    }

    const [employees, invites, users] = await Promise.all([
      base44.asServiceRole.entities.Employee.filter({ organization_id }, '-created_date', 1000),
      base44.asServiceRole.entities.PendingInvite.filter({ organization_id }, '-created_date', 1000),
      base44.asServiceRole.entities.User.filter({ organization_id }, '-created_date', 1000),
    ]);

    const usersById = new Map(users.map(u => [u.id, u]));
    const invitesByEmail = new Map(invites.map(i => [normEmail(i.email), i]));

    const matchedUserIds = new Set();
    const matchedInviteIds = new Set();

    function computeStatus({ linkedUser, invite, employee }) {
      if (linkedUser?.account_status === 'deactivated') return 'deactivated';
      if (!linkedUser && employee && employee.is_active === false) return 'deactivated';
      if (linkedUser?.account_status === 'locked') return 'locked';
      if (invite && !linkedUser) return 'invited';
      if (linkedUser) return 'active';
      return 'profile_only';
    }

    function buildEntry({ employee, linkedUser, invite }) {
      const roles = linkedUser
        ? (linkedUser.roles && linkedUser.roles.length ? linkedUser.roles : (linkedUser.role ? [linkedUser.role] : []))
        : invite
          ? (invite.roles || [])
          : (employee?.role ? [employee.role] : []);

      return {
        name: employee?.name || linkedUser?.full_name || [invite?.first_name, invite?.last_name].filter(Boolean).join(' ') || '',
        email: employee?.email || linkedUser?.email || invite?.email || '',
        roles,
        hire_date: employee?.hire_date || null,
        status: computeStatus({ linkedUser, invite, employee }),
        employee_id: employee?.id || null,
        user_id: linkedUser?.id || null,
        invite_id: invite?.id || null,
        last_login_at: linkedUser?.last_login_at || null,
        is_active: employee ? employee.is_active !== false : true,
      };
    }

    const team = [];

    // 1. Employee records — strict user_id match, invite match by email only when unlinked
    for (const employee of employees) {
      const linkedUser = employee.user_id ? usersById.get(employee.user_id) || null : null;
      if (linkedUser) matchedUserIds.add(linkedUser.id);

      let invite = null;
      if (!employee.user_id) {
        invite = invitesByEmail.get(normEmail(employee.email)) || null;
        if (invite) matchedInviteIds.add(invite.id);
      }

      team.push(buildEntry({ employee, linkedUser, invite }));
    }

    // 2. Pending invites with no matching Employee
    for (const invite of invites) {
      if (matchedInviteIds.has(invite.id)) continue;
      team.push(buildEntry({ employee: null, linkedUser: null, invite }));
    }

    // 3. Org users with no matching Employee
    for (const orgUser of users) {
      if (matchedUserIds.has(orgUser.id)) continue;
      team.push(buildEntry({ employee: null, linkedUser: orgUser, invite: null }));
    }

    team.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const counts = { active: 0, invited: 0, profile_only: 0, deactivated: 0, locked: 0 };
    for (const entry of team) {
      if (counts[entry.status] !== undefined) counts[entry.status]++;
    }

    return Response.json({ team, counts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});