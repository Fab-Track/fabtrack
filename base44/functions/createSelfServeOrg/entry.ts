import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Called from the Shop Setup step of the onboarding wizard for a brand-new,
// self-serve signup (no PendingInvite matched them to an existing org).
// Creates a fresh trial Organization and stamps the calling user as its Owner.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.organization_id) {
      return Response.json({ error: 'You already belong to an organization.' }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const { shop_name, primary_trade, shop_size, default_hourly_rate } = body;
    if (!shop_name || !primary_trade || !shop_size) {
      return Response.json({ error: 'shop_name, primary_trade, and shop_size are required' }, { status: 400 });
    }

    const slug = shop_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let finalSlug = slug;
    const existing = await base44.asServiceRole.entities.Organization.filter({ slug });
    if (existing.length > 0) {
      finalSlug = `${slug}-${Date.now().toString().slice(-5)}`;
    }

    const now = new Date().toISOString();
    const org = await base44.asServiceRole.entities.Organization.create({
      name: shop_name,
      slug: finalSlug,
      is_active: true,
      plan: 'trial',
      subscription_status: 'trial',
      trial_started_at: now,
      primary_trade,
      shop_size,
      default_hourly_rate: default_hourly_rate != null ? Number(default_hourly_rate) || 0 : undefined,
      onboarding_completed: false, // still needs to finish Job/Invite steps
    });

    // Starter AppSettings
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

    // Default option lists
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

    // Default roles
    const defaultRoleDefs = [
      { key: 'owner', name: 'Owner', archetype: 'admin', description: 'Full access to all features and settings.' },
      { key: 'manager', name: 'Manager', archetype: 'admin', description: 'Manages jobs, schedules, and team. Can view reports.' },
      { key: 'fabricator', name: 'Fabricator', archetype: 'shop_floor', description: 'Sees assigned jobs, clocks in/out, and accesses the shop floor.' },
    ];
    let ownerRoleId = null;
    for (const role of defaultRoleDefs) {
      const record = await base44.asServiceRole.entities.Role.create({ ...role, org_id: org.id, is_default: true });
      if (role.key === 'owner') ownerRoleId = record.id;
    }

    // Stamp the current user as Owner of the new org
    await base44.asServiceRole.entities.User.update(user.id, {
      organization_id: org.id,
      organization_name: org.name,
      roles: ['owner'],
      role_ids: ownerRoleId ? [ownerRoleId] : [],
      account_status: 'active',
    });

    // Notify the platform owner — best-effort, failure doesn't block signup
    let notifySent = false;
    let notifyError = null;
    try {
      const body = `A new self-serve trial organization was just created on FabTrack.

Org name: ${org.name}
Owner: ${user.full_name || user.email} (${user.email})
Trade: ${primary_trade}
Shop size: ${shop_size}
Created: ${now}`;
      console.log(`[createSelfServeOrg] invoking Core.SendEmail: to=info@fab-track.io`);
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'info@fab-track.io',
        subject: `New trial org created: ${org.name}`,
        body,
        from_name: 'FabTrack',
      });
      notifySent = true;
      console.log(`[createSelfServeOrg] Core.SendEmail succeeded`);
    } catch (e) {
      notifyError = e?.message || 'Failed to send notification email';
      console.log(`[createSelfServeOrg] Core.SendEmail threw: ${e?.message}`);
    }

    return Response.json({
      success: true,
      organization: { id: org.id, name: org.name, slug: org.slug },
      notification_sent: notifySent,
      notification_error: notifyError,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});