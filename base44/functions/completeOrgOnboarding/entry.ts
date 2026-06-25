import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userRoles = (user.roles || []).map((r) => r.toLowerCase());
    const isOwnerOrAdmin = userRoles.includes('owner') || userRoles.includes('admin');
    if (!isOwnerOrAdmin) {
      return Response.json({ error: 'Forbidden: owner/admin only' }, { status: 403 });
    }

    const orgId = user.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { shop_settings, job_details, invites } = body;

    // ── 1. Update org with shop settings + mark onboarding complete ──
    const orgUpdate = {
      onboarding_completed: true,
    };
    if (shop_settings) {
      if (shop_settings.shop_name) orgUpdate.name = shop_settings.shop_name;
      if (shop_settings.primary_trade) orgUpdate.primary_trade = shop_settings.primary_trade;
      if (shop_settings.shop_size) orgUpdate.shop_size = shop_settings.shop_size;
      if (shop_settings.default_hourly_rate != null) {
        orgUpdate.default_hourly_rate = Number(shop_settings.default_hourly_rate) || 0;
      }
    }

    const updatedOrg = await base44.asServiceRole.entities.Organization.update(orgId, orgUpdate);

    // ── 2. Create the first customer + job ──
    let createdJob = null;
    if (job_details && job_details.job_name) {
      // Create customer
      const customer = await base44.asServiceRole.entities.Customer.create({
        organization_id: orgId,
        name: job_details.customer_name || 'Walk-in Customer',
        type: 'Homeowner',
      });

      // Generate job number: ORGSLUG-YYYY-001
      const year = new Date().getFullYear();
      const orgSlug = (updatedOrg.slug || updatedOrg.name || 'SHOP')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6);

      // Map quick status → pipeline board + stage
      const statusMap = {
        'Estimating': { board: 'Sales', stage: 'Estimate in Progress' },
        'In Production': { board: 'Shop', stage: 'Fabricate' },
        'Ready to Install': { board: 'Shop', stage: 'Ready for Install' },
        'Complete': { board: 'Shop', stage: 'Install Complete' },
      };
      const mapped = statusMap[job_details.quick_status] || statusMap['Estimating'];
      const now = new Date().toISOString();

      createdJob = await base44.asServiceRole.entities.Job.create({
        organization_id: orgId,
        job_number: `${orgSlug}-${year}-001`,
        customer_id: customer.id,
        customer_name: customer.name,
        job_name: job_details.job_name,
        job_type: job_details.job_type || 'Other',
        pipeline_board: mapped.board,
        stage: mapped.stage,
        stage_entered_at: now,
        stage_history: [{
          from_board: '',
          to_board: mapped.board,
          from_stage: '',
          to_stage: mapped.stage,
          timestamp: now,
          note: 'Created during onboarding',
        }],
        status: mapped.board === 'Shop' ? 'In Fabrication' : 'Estimate',
        expected_install_date: job_details.estimated_due_date || null,
        last_activity_date: now,
        lead_source: 'Manual',
      });
    }

    // ── 3. Invite team members (best-effort) ──
    const inviteResults = [];
    if (invites && Array.isArray(invites)) {
      const roleMap = {
        'Shop Manager': 'shop_manager',
        'Estimator': 'estimator',
        'Welder/Fabricator': 'fabricator',
        'Office Admin': 'admin',
      };

      for (const invite of invites) {
        if (!invite.email || !invite.email.trim()) continue;
        try {
          const role = roleMap[invite.role] || 'user';
          await base44.asServiceRole.users.inviteUser(invite.email.trim(), role);
          inviteResults.push({ email: invite.email, success: true });
        } catch (err) {
          inviteResults.push({ email: invite.email, success: false, error: err.message });
        }
      }
    }

    return Response.json({
      success: true,
      org: { id: updatedOrg.id, name: updatedOrg.name },
      job: createdJob ? { id: createdJob.id, job_number: createdJob.job_number, job_name: createdJob.job_name } : null,
      invites: inviteResults,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});