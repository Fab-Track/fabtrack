import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { name, phone, email, address, project_type, description, org_id } = body;

    const orgId = org_id;
    if (!orgId) {
      return Response.json({ error: "Missing org_id in request body" }, { status: 400 });
    }

    if (!name || !phone || !email || !description) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Deduplicate customer by email within the org
    const existing = await base44.asServiceRole.entities.Customer.filter({
      email: email,
      organization_id: orgId
    });

    let customer;
    if (existing && existing.length > 0) {
      customer = existing[0];
    } else {
      customer = await base44.asServiceRole.entities.Customer.create({
        name: name,
        email: email,
        phone: phone,
        address: address || "",
        type: "Homeowner",
        organization_id: orgId
      });
    }

    // Generate a job number
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
    const jobNumber = `HCMW-${year}-${seq}`;

    // Create the job in the Sales pipeline
    const now = new Date().toISOString();
    const job = await base44.asServiceRole.entities.Job.create({
      organization_id: orgId,
      job_number: jobNumber,
      customer_id: customer.id,
      customer_name: name,
      job_name: `${name} — ${project_type || "Quote Request"}`,
      job_type: project_type || "Other",
      lead_customer_phone: phone,
      lead_customer_email: email,
      site_address: address || "",
      design_details: description,
      pipeline_board: "Sales",
      stage: "New Lead",
      stage_entered_at: now,
      last_activity_date: now,
      lead_source: "Website Form",
      status: "Estimate",
      stage_history: [{
        from_board: null,
        to_board: "Sales",
        from_stage: null,
        to_stage: "New Lead",
        timestamp: now,
        note: `Lead submitted via website form. Phone: ${phone}. Email: ${email}.`,
      }],
    });

    // In-app notification (no email credits used)
    await base44.asServiceRole.entities.Notification.create({
      organization_id: orgId,
      title: `New Lead: ${name}`,
      body: `Website lead from ${name}. Phone: ${phone}. Email: ${email}. Project: ${project_type || "Quote Request"}. Description: ${description}`,
      type: "new_lead",
      link: `/jobs/${job.id}`,
      is_read: false,
      target_roles: ["admin", "owner", "estimator"]
    });

    return Response.json({ success: true, job_id: job.id, customer_id: customer.id, job_number: jobNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}