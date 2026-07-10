import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["admin","owner"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employee_id, employee_name } = await req.json();
    if (!employee_id) return Response.json({ error: "employee_id required" }, { status: 400 });

    // Verify the target employee belongs to the caller's own organization —
    // otherwise an admin in org A could hijack/delete another org's onboarding survey.
    const employee = await base44.asServiceRole.entities.Employee.get(employee_id);
    if (!employee || employee.organization_id !== user.organization_id) {
      return Response.json({ error: "Employee not found" }, { status: 404 });
    }

    // Generate a unique token
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    const token = Array.from(array).map(b => b.toString(16).padStart(2,'0')).join('');

    // Expires in 7 days
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Delete any existing surveys for this employee (one at a time)
    const existing = await base44.asServiceRole.entities.OnboardingSurvey.filter({ employee_id });
    for (const s of existing) {
      await base44.asServiceRole.entities.OnboardingSurvey.delete(s.id);
    }

    // Create the new survey record
    await base44.asServiceRole.entities.OnboardingSurvey.create({
      employee_id,
      employee_name: employee_name || "",
      token,
      expires_at,
      is_completed: false,
    });

    // Build the survey URL
    const origin = req.headers.get("origin") || "https://app.base44.com";
    const survey_url = `${origin}/onboarding?token=${token}`;

    return Response.json({ survey_url, token, expires_at });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});