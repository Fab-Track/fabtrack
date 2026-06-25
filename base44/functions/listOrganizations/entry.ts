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

    // Fetch all organizations
    const orgs = await base44.asServiceRole.entities.Organization.list('-created_date');

    // For each org, gather stats
    const enriched = [];
    for (const org of orgs) {
      // Count users in this org
      const users = await base44.asServiceRole.entities.User.filter({ organization_id: org.id });
      const userCount = users.length;

      // Find the owner
      const owner = users.find(u => (u.roles || []).includes('owner') || u.role === 'owner');

      // Count jobs
      const jobs = await base44.asServiceRole.entities.Job.filter({ organization_id: org.id });
      const jobCount = jobs.length;

      // Count customers
      const customers = await base44.asServiceRole.entities.Customer.filter({ organization_id: org.id });
      const customerCount = customers.length;

      // Count employees
      const employees = await base44.asServiceRole.entities.Employee.filter({ organization_id: org.id });
      const employeeCount = employees.length;

      enriched.push({
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        subscription_status: org.subscription_status || 'trial',
        is_active: org.is_active,
        is_demo: org.is_demo || false,
        created_date: org.created_date,
        owner_name: owner ? (owner.full_name || owner.email) : null,
        owner_email: owner ? owner.email : null,
        user_count: userCount,
        job_count: jobCount,
        customer_count: customerCount,
        employee_count: employeeCount,
      });
    }

    return Response.json({ organizations: enriched });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});