import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(user.roles || []).includes('super_admin')) {
      return Response.json({ error: 'Forbidden: super_admin only' }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const trialWindowEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Fetch all orgs, jobs, and users in parallel
    const [orgs, allJobs, allUsers] = await Promise.all([
      base44.asServiceRole.entities.Organization.list('-created_date', 10000),
      base44.asServiceRole.entities.Job.list('-created_date', 50000),
      base44.asServiceRole.entities.User.list('-created_date', 10000),
    ]);

    // Build per-org lookup maps for jobs and users
    const jobsByOrg = {};
    for (const job of allJobs) {
      const oid = job.organization_id;
      if (!oid) continue;
      jobsByOrg[oid] = (jobsByOrg[oid] || 0) + 1;
    }

    const usersByOrg = {};
    for (const u of allUsers) {
      const oid = u.organization_id;
      if (!oid) continue;
      usersByOrg[oid] = (usersByOrg[oid] || 0) + 1;
    }

    // --- Summary metrics ---
    // Active orgs: exclude demo and inactive/deleted orgs
    const activeOrgs = orgs.filter(o => o.is_active !== false && !o.is_demo);
    const totalActiveOrgs = activeOrgs.length;
    const totalJobs = allJobs.length;
    const totalUsers = allUsers.filter(u => u.organization_id).length;

    // Trials expiring within 14 days (trial period = 14 days from creation)
    const trialsExpiringSoon = orgs.filter(o => {
      if (o.is_demo) return false;
      const isTrial = o.plan === 'trial' || o.subscription_status === 'trial';
      if (!isTrial) return false;
      const created = new Date(o.created_date);
      const trialEnd = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
      return trialEnd >= now && trialEnd <= trialWindowEnd;
    }).length;

    // --- Conversion snapshot ---
    const trialOrgs = orgs.filter(o =>
      !o.is_demo && (o.plan === 'trial' || o.subscription_status === 'trial')
    );
    const paidOrgs = orgs.filter(o =>
      !o.is_demo && ['starter', 'professional', 'enterprise'].includes(o.plan)
    );
    const totalOrgsEver = orgs.filter(o => !o.is_demo).length;
    const conversionRate = totalOrgsEver > 0
      ? Math.round((paidOrgs.length / totalOrgsEver) * 1000) / 10
      : 0;

    // --- Activity feed (last 7 days) ---
    const newOrgs7d = orgs.filter(o => new Date(o.created_date) >= sevenDaysAgo).length;
    const newJobs7d = allJobs.filter(j => j.created_date && new Date(j.created_date) >= sevenDaysAgo).length;
    const newUsers7d = allUsers.filter(u => u.created_date && new Date(u.created_date) >= sevenDaysAgo).length;

    // --- Per-plan breakdown ---
    const plans = ['trial', 'starter', 'professional', 'enterprise'];
    const planBreakdown = plans.map(plan => {
      const planOrgs = orgs.filter(o => o.plan === plan && !o.is_demo);
      const orgCount = planOrgs.length;
      const jobCount = planOrgs.reduce((sum, o) => sum + (jobsByOrg[o.id] || 0), 0);
      const userCount = planOrgs.reduce((sum, o) => sum + (usersByOrg[o.id] || 0), 0);
      return {
        plan,
        org_count: orgCount,
        avg_jobs: orgCount > 0 ? Math.round((jobCount / orgCount) * 10) / 10 : 0,
        avg_users: orgCount > 0 ? Math.round((userCount / orgCount) * 10) / 10 : 0,
      };
    });

    return Response.json({
      summary: {
        total_active_orgs: totalActiveOrgs,
        total_jobs: totalJobs,
        total_users: totalUsers,
        trials_expiring_soon: trialsExpiringSoon,
      },
      conversion: {
        trial_orgs: trialOrgs.length,
        paid_orgs: paidOrgs.length,
        total_orgs_ever: totalOrgsEver,
        conversion_rate: conversionRate,
      },
      activity_7d: {
        new_orgs: newOrgs7d,
        new_jobs: newJobs7d,
        new_users: newUsers7d,
      },
      plan_breakdown: planBreakdown,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});