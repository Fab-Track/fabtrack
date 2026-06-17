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
    const { organizationId, name, plan, subscriptionStatus, isActive } = body;

    if (!organizationId) {
      return Response.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Fetch the org
    const org = await base44.asServiceRole.entities.Organization.get(organizationId);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build update payload
    const updates = {};
    const changes = [];

    if (name !== undefined && name !== org.name) {
      updates.name = name;
      // Regenerate slug if name changes
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      changes.push(`Name: "${org.name}" → "${name}"`);
    }

    if (plan !== undefined && plan !== org.plan) {
      updates.plan = plan;
      changes.push(`Plan: "${org.plan}" → "${plan}"`);
    }

    if (subscriptionStatus !== undefined && subscriptionStatus !== org.subscription_status) {
      updates.subscription_status = subscriptionStatus;
      // Also update is_active for legacy compatibility
      updates.is_active = subscriptionStatus !== 'suspended';
      changes.push(`Status: "${org.subscription_status || 'trial'}" → "${subscriptionStatus}"`);
    }

    if (isActive !== undefined && isActive !== org.is_active && subscriptionStatus === undefined) {
      updates.is_active = isActive;
      changes.push(`Active: ${org.is_active} → ${isActive}`);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ success: true, organization: org, changes: [] });
    }

    const updated = await base44.asServiceRole.entities.Organization.update(organizationId, updates);

    // Determine action type for audit
    let actionType = 'org_updated';
    if (subscriptionStatus === 'suspended') actionType = 'org_suspended';
    else if (subscriptionStatus === 'active' && org.subscription_status === 'suspended') actionType = 'org_reactivated';
    else if (updates.plan && !updates.subscription_status) actionType = 'plan_changed';

    // Log audit entry
    await base44.asServiceRole.entities.SuperAdminAuditLog.create({
      admin_email: user.email,
      admin_name: user.full_name || user.email,
      action_type: actionType,
      organization_id: organizationId,
      organization_name: name || org.name,
      action_detail: changes.join('; '),
      metadata: {
        previous: { name: org.name, plan: org.plan, subscription_status: org.subscription_status, is_active: org.is_active },
        new: { name: updates.name || org.name, plan: updates.plan || org.plan, subscription_status: updates.subscription_status || org.subscription_status, is_active: updates.is_active !== undefined ? updates.is_active : org.is_active },
      },
    });

    return Response.json({
      success: true,
      organization: updated,
      changes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});