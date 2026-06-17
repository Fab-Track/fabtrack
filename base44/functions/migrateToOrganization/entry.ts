import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'owner' && !(user.roles || []).includes('owner') && !(user.roles || []).includes('super_admin')) {
      return Response.json({ error: 'Only the organization owner can run this migration' }, { status: 403 });
    }

    // Create the first organization — High Country Metal Works
    const orgs = await base44.entities.Organization.filter({ slug: 'hcmw' });
    let orgId;
    if (orgs.length === 0) {
      const org = await base44.entities.Organization.create({
        name: 'High Country Metal Works',
        slug: 'hcmw',
        is_active: true,
        plan: 'professional',
      });
      orgId = org.id;
    } else {
      orgId = orgs[0].id;
    }

    // Assign all existing users to this org (skip super_admins)
    const users = await base44.entities.User.list();
    let usersUpdated = 0;
    for (const user of users) {
      if (!user.organization_id && !(user.roles || []).includes('super_admin')) {
        await base44.entities.User.update(user.id, {
          organization_id: orgId,
          organization_name: 'High Country Metal Works',
        });
        usersUpdated++;
      }
    }

    // Migrate ALL entity types — add organization_id to every record that lacks it
    const entityNames = [
      'Job', 'Customer', 'Estimate', 'Invoice', 'ChangeOrder',
      'Employee', 'TimeEntry', 'ScheduledEvent', 'JobAttachment',
      'AttachmentCategory', 'JobService', 'JobTodo', 'MessageChannel',
      'Message', 'Notification', 'CommMessage', 'ChannelMembership',
      'ServiceCatalog', 'InventoryItem', 'Vendor', 'PurchaseOrder',
      'QCInspection', 'TwilioPhoneNumber', 'EmployeeDocument',
      'EmployeeGoal', 'EmployeeReview', 'CorrectionRequest',
      'AdminActivityLog', 'InventoryDeductionLog', 'AppSettings',
      'LineItemCategory', 'MaterialPriceList', 'MaterialReservation',
      'MessageTemplate', 'OnboardingSurvey', 'ProductServiceLibrary',
      'RailingStyleLibrary', 'TimeAuditLog', 'WriteUp',
    ];

    const results = {};
    for (const entityName of entityNames) {
      let count = 0;
      try {
        const records = await base44.entities[entityName].list();
        for (const record of records) {
          if (!record.organization_id) {
            await base44.entities[entityName].update(record.id, {
              organization_id: orgId,
            });
            count++;
          }
        }
      } catch (e) {
        // Entity might not exist or be empty — skip gracefully
        results[entityName] = { error: e.message };
        continue;
      }
      results[entityName] = { updated: count };
    }

    // Migrate AppSettings — update setting_key to include org scope
    const settings = await base44.entities.AppSettings.list();
    let settingsUpdated = 0;
    for (const s of settings) {
      if (!s.organization_id) {
        await base44.entities.AppSettings.update(s.id, {
          organization_id: orgId,
          setting_key: 'main',
        });
        settingsUpdated++;
      }
    }

    return Response.json({
      success: true,
      organization: { id: orgId, name: 'High Country Metal Works', slug: 'hcmw' },
      users_updated: usersUpdated,
      entities_migrated: results,
      settings_updated: settingsUpdated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});