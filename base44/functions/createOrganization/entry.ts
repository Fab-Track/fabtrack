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

    // 1. Create the organization — pre-created via super admin, so the owner
    // never sees the self-serve shop-setup wizard (they just get a welcome).
    const org = await base44.asServiceRole.entities.Organization.create({
      name,
      slug,
      is_active: true,
      plan: 'trial',
      onboarding_completed: true,
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

    // 1b. Seed JobDetailConfig with default option lists
    await base44.asServiceRole.entities.JobDetailConfig.create({
      organization_id: org.id,
      products: ['Railing', 'Grab Rails', 'Staircase', 'Structural', 'Awning', 'Planter Box', 'Ladder', 'Fireplace', 'Wall Wrap', 'Pergola', 'Gate', 'Dumpster Gate', 'Chimney Cap', 'Other'],
      railing_styles: ['Columbia', 'Clearwater', 'Uptown', 'Bremerton', 'Kennewick', 'Handford', 'Longview', 'Rainer', 'Tacoma', 'The Craftsman', 'Cable', 'Custom'],
      powdercoat_colors: ['Matte Black', 'Semi Gloss Black', 'Matte White', 'Gloss White', 'Oil Rubbed Bronze', 'Wrinkle Black', 'Dark Bronze', 'Black Brown', 'Silk Grey', 'Galvanized', 'Other'],
      stair_styles: ['Mono', 'Spiral', 'Double Stringer', 'Twin Stringer', 'Platform', 'Bridge', 'Other'],
      stair_materials: ['Spiral Post 4.5" OD', 'C-Channel 2"x10"', 'C-Channel 1.5"x10"', 'Rec Tube 2"x10"x3/16"', '6"x8" Rec Tube', 'Other'],
      stair_tread_materials: ['Galvanized Safety Treads', 'Wood Steps', 'Expanded Metal', 'Metal Grating', '1/4" Flat Plate', 'Metal Bent Pans', 'Other'],
      surfaces: ['Wood Floors', 'Trex', 'Waterproofed Deck', 'Tile Floor', 'Bricks', 'Concrete', 'Steel', 'Asphalt', 'Metal Siding', 'Other'],
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

    // 3. Invite or link the owner user
    const emailNorm = ownerEmail.trim().toLowerCase();
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: ownerEmail });
    let inviteStatus = 'invited';
    let emailSent = null;
    let emailError = null;

    if (existingUsers.length > 0) {
      // User already exists — update their organization affiliation directly
      const ownerUser = existingUsers[0];
      if (ownerUser.organization_id && ownerUser.organization_id !== org.id) {
        // Guard: don't silently move a user out of another org they already belong to
        await base44.asServiceRole.entities.Organization.delete(org.id);
        return Response.json({ error: `This email already belongs to another organization ("${ownerUser.organization_name || ownerUser.organization_id}"). Remove them from that org first if you want to reassign them.` }, { status: 409 });
      }
      await base44.asServiceRole.entities.User.update(ownerUser.id, {
        organization_id: org.id,
        organization_name: name,
        full_name: ownerName,
        roles: ['owner'],
        role_ids: [createdRoles['owner']],
        account_status: 'active',
      });
      inviteStatus = 'linked_existing_account';
    } else {
      // Guard: an invite for this email must not already exist for a different org
      const existingInvites = await base44.asServiceRole.entities.PendingInvite.filter({});
      const dupe = existingInvites.find(i => (i.email || '').trim().toLowerCase() === emailNorm);
      if (dupe) {
        await base44.asServiceRole.entities.Organization.delete(org.id);
        return Response.json({ error: `An invite for this email is already pending for organization "${dupe.organization_name || dupe.organization_id}".` }, { status: 409 });
      }

      // New user — create a PendingInvite, same mechanism as employee invites
      await base44.asServiceRole.entities.PendingInvite.create({
        organization_id: org.id,
        organization_name: name,
        first_name: ownerName,
        email: ownerEmail.trim(),
        roles: ['owner'],
        status: 'pending',
        invited_by_id: user.id,
        invited_by_name: user.full_name || user.email,
      });

      // Email the owner — failure doesn't block org creation, but is captured and
      // reported back to the calling admin so a silent-failure isn't invisible.
      try {
        const body = `Hi ${ownerName},

You've been set up as the owner of "${name}" on FabTrack by ${user.full_name || user.email}.

To activate your account, register at fab-track.io using this exact email address: ${ownerEmail.trim()}

Once you sign up with this email, you'll automatically land in "${name}" as the owner — no additional setup needed.

— The FabTrack Team`;
        console.log(`[createOrganization] invoking Core.SendEmail: to=${ownerEmail.trim()}`);
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ownerEmail.trim(),
          subject: `You've been set up as owner of ${name} on FabTrack`,
          body,
          from_name: 'FabTrack',
        });
        emailSent = true;
        console.log(`[createOrganization] Core.SendEmail succeeded`);
      } catch (e) {
        emailSent = false;
        emailError = e?.message || 'Failed to send invite email';
        console.log(`[createOrganization] Core.SendEmail threw: ${e?.message}`);
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
        status: inviteStatus,
        email_sent: emailSent,
        email_error: emailError,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});