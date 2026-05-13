import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { name, phone, email, address, project_type, description } = body;

    if (!name || !phone || !email || !description) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate a job number
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
    const jobNumber = `HCMW-${year}-${seq}`;

    // Create the job in the Sales pipeline
    const now = new Date().toISOString();
    const job = await base44.asServiceRole.entities.Job.create({
      job_number: jobNumber,
      job_name: `${name} — ${project_type || "Quote Request"}`,
      job_type: project_type || "Other",
      customer_name: name,
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

    // Notify owners/estimators via email
    // Get admin/estimator users
    const users = await base44.asServiceRole.entities.User.list();
    const notifyUsers = users.filter(u =>
      u.role === "admin" || u.role === "owner" || u.role === "estimator"
    );

    const emailPromises = notifyUsers.map(u =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        subject: `New Lead: ${name} — ${project_type}`,
        body: `A new lead has arrived from the website.\n\nCustomer: ${name}\nPhone: ${phone}\nEmail: ${email}\nAddress: ${address}\nProject Type: ${project_type}\n\nDescription:\n${description}\n\nJob created: ${jobNumber}\n\nLog in to FabTrack to review and assign: https://app.base44.com`,
      }).catch(() => null) // don't fail if email fails
    );

    await Promise.all(emailPromises);

    return Response.json({ success: true, job_id: job.id, job_number: jobNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});