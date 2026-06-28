import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = user.roles || [];
    if (!userRoles.includes('super_admin')) {
      return Response.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { name, ownerName, ownerEmail } = body;

    if (!name || !ownerName || !ownerEmail) {
      return Response.json({ error: 'name, ownerName, and ownerEmail are required' }, { status: 400 });
    }

    // Generate a slug from the name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check that slug isn't already taken
    const existing = await base44.asServiceRole.entities.Organization.filter({ slug });
    if (existing.length > 0) {
      return Response.json({ error: `An organization with slug "${slug}" already exists. Choose a different name.` }, { status: 409 });
    }

    // 1. Create the organization
    const org = await base44.asServiceRole.entities.Organization.create({
      name,
      slug,
      is_active: true,
      plan: 'trial',
    });

    // 2. Create empty starter AppSettings for this org
    await base44.asServiceRole.entities.AppSettings.create({
      organization_id: org.id,
      setting_key: 'main',
      system_sender_status: 'disconnected',
      session_timeout_mobile_hours: 8,
      session_timeout_desktop_hours: 4,
      require_2fa_roles: [],
      payroll_workweek_start_day: 1,
      estimate_contract_text: '',
      estimate_approval_email_enabled: false,
      stripe_is_connected: false,
      stripe_mode: '',
    });

    // 2a. Seed default Role records for this org
    const defaultRoleDefs = [
      { key: 'owner',       name: 'Owner',       archetype: 'admin',      description: 'Full access to all features and settings.' },
      { key: 'manager',     name: 'Manager',     archetype: 'admin',      description: 'Manages jobs, schedules, and team. Can view reports.' },
      { key: 'fabricator',  name: 'Fabricator',  archetype: 'shop_floor', description: 'Sees assigned jobs, clocks in/out, and accesses the shop floor.' },
    ];
    const createdRoles = {};
    for (const role of defaultRoleDefs) {
      const record = await base44.asServiceRole.entities.Role.create({
        ...role,
        org_id: org.id,
        is_default: true,
      });
      createdRoles[role.key] = record.id;
    }

    // 3. Invite or update the owner user
    let ownerUser = null;
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: ownerEmail });
    
    if (existingUsers.length > 0) {
      // User already exists — update their organization affiliation
      ownerUser = existingUsers[0];
      await base44.asServiceRole.entities.User.update(ownerUser.id, {
        organization_id: org.id,
        organization_name: name,
        full_name: ownerName,
        roles: ['owner'],
        role_ids: [createdRoles['owner']],
      });
    } else {
      // New user — invite them as admin (platform only supports 'user'/'admin')
      await base44.users.inviteUser(ownerEmail, 'admin');
      
      // Find the just-created invited user
      const newUsers = await base44.asServiceRole.entities.User.filter({ email: ownerEmail });
      if (newUsers.length > 0) {
        ownerUser = newUsers[0];
        await base44.asServiceRole.entities.User.update(ownerUser.id, {
          organization_id: org.id,
          organization_name: name,
          full_name: ownerName,
          roles: ['owner'],
          role_ids: [createdRoles['owner']],
        });
      }
    }

    // Log audit entry
    await base44.asServiceRole.entities.SuperAdminAuditLog.create({
      admin_email: user.email,
      admin_name: user.full_name || user.email,
      action_type: 'org_created',
      organization_id: org.id,
      organization_name: name,
      action_detail: `Created organization "${name}" with owner "${ownerName}" (${ownerEmail})`,
      affected_user_email: ownerEmail,
      affected_user_name: ownerName,
    });

    return Response.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        is_active: org.is_active,
        created_date: org.created_date,
      },
      owner: {
        email: ownerEmail,
        name: ownerName,
        status: 'invited',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});