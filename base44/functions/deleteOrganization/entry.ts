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
    const { organizationId, confirmation } = body;

    if (!organizationId || confirmation !== 'DELETE') {
      return Response.json({ error: 'organizationId and confirmation="DELETE" are required' }, { status: 400 });
    }

    // Fetch the org
    const org = await base44.asServiceRole.entities.Organization.get(organizationId);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgName = org.name;

    // Collect stats before deletion for audit
    const [users, jobs] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ organization_id: organizationId }),
      base44.asServiceRole.entities.Job.filter({ organization_id: organizationId }),
    ]);

    // Delete all entity records scoped to this org
    // Entities with organization_id (order matters — some reference others)
    const entitiesToClean = [
      'JobAttachment', 'MaterialReservation', 'InventoryDeductionLog',
      'PurchaseOrder', 'JobService', 'JobTodo', 'Message', 'MessageChannel',
      'ChannelMembership', 'CommMessage', 'Notification', 'ScheduledEvent',
      'TimeEntry', 'TimeAuditLog', 'CorrectionRequest', 'WriteUp',
      'EmployeeDocument', 'EmployeeGoal', 'EmployeeReview', 'OnboardingSurvey',
      'QCInspection', 'ChangeOrder', 'Estimate', 'Invoice',
      'Job', 'Customer', 'Employee', 'Vendor', 'InventoryItem',
      'ServiceCatalog', 'ProductServiceLibrary', 'LineItemCategory',
      'MaterialPriceList', 'RailingStyleLibrary', 'MessageTemplate',
      'TwilioPhoneNumber', 'AttachmentCategory', 'AppSettings', 'AdminActivityLog',
      'SuperAdminAuditLog',
    ];

    for (const entityName of entitiesToClean) {
      const records = await base44.asServiceRole.entities[entityName].filter({ organization_id: organizationId });
      const deletions = records.map((r) => base44.asServiceRole.entities[entityName].delete(r.id));
      await Promise.all(deletions);
    }

    // Clear organization_id from users (don't delete them, just unlink)
    const userUpdates = users.map((u) =>
      base44.asServiceRole.entities.User.update(u.id, {
        organization_id: null,
        organization_name: null,
      })
    );
    await Promise.all(userUpdates);

    // Finally delete the org
    await base44.asServiceRole.entities.Organization.delete(organizationId);

    // Log audit entry
    await base44.asServiceRole.entities.SuperAdminAuditLog.create({
      admin_email: user.email,
      admin_name: user.full_name || user.email,
      action_type: 'org_deleted',
      organization_id: organizationId,
      organization_name: orgName,
      action_detail: `Deleted "${orgName}" and all associated data. ${users.length} users unlinked, ${jobs.length} jobs removed.`,
      metadata: {
        user_count: users.length,
        job_count: jobs.length,
        org_name: orgName,
        org_slug: org.slug,
      },
    });

    return Response.json({
      success: true,
      message: `Organization "${orgName}" and all its data permanently deleted. ${users.length} users unlinked.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});