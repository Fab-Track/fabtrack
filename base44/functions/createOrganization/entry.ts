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

    // 3. Invite the owner user
    const inviteResult = await base44.asServiceRole.users.inviteUser(ownerEmail, 'owner');

    // 4. Update the invited user with organization_id and name
    // The invited user gets created with status 'invited' — find them by email
    const users = await base44.asServiceRole.entities.User.filter({ email: ownerEmail });
    if (users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        organization_id: org.id,
        organization_name: name,
        full_name: ownerName,
        roles: ['owner'],
      });
    }

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