import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userRoles = (user.roles || []).map((r) => r.toLowerCase());
    const isOwnerOrAdmin = userRoles.includes('owner') || userRoles.includes('admin');
    if (!isOwnerOrAdmin) {
      return Response.json({ needs_onboarding: false });
    }

    const orgId = user.organization_id;
    if (!orgId) return Response.json({ needs_onboarding: false });

    // Fetch org record
    const org = await base44.asServiceRole.entities.Organization.get(orgId);
    if (!org) return Response.json({ needs_onboarding: false });

    // Already completed — never show again
    if (org.onboarding_completed === true) {
      return Response.json({ needs_onboarding: false });
    }

    // Check if org has any jobs — if they already created one, skip the wizard
    const jobs = await base44.asServiceRole.entities.Job.filter(
      { organization_id: orgId, is_archived: false },
      '-created_date',
      1
    );

    if (jobs.length > 0) {
      return Response.json({ needs_onboarding: false });
    }

    return Response.json({
      needs_onboarding: true,
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        primary_trade: org.primary_trade || '',
        shop_size: org.shop_size || '',
        default_hourly_rate: org.default_hourly_rate || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});