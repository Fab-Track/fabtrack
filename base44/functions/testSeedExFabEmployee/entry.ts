import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// TEMPORARY test-only function for a cross-org isolation test. Delete after use.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    if (body.cleanup === true) {
      const toDelete = await base44.asServiceRole.entities.Employee.filter({
        organization_id: "6a3d4408e96af0b1976eb0f9",
        email: "cole.morley+xorgtest@gmail.com",
      });
      for (const emp of toDelete) {
        await base44.asServiceRole.entities.Employee.delete(emp.id);
      }
      return Response.json({ deleted: true, count: toDelete.length });
    }

    const email = body.email ?? "cole.morley+xorgtest@gmail.com";

    const employee = await base44.asServiceRole.entities.Employee.create({
      email,
      name: "XOrg Test",
      role: "fabricator",
      organization_id: "6a3d4408e96af0b1976eb0f9",
      is_active: true,
      user_id: null,
    });

    return Response.json({ created: true, id: employee.id, email: employee.email, organization_id: employee.organization_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});