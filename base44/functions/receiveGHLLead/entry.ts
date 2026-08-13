import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const VALID_JOB_TYPES = ["Fence", "Gate", "Railing", "Staircase", "Custom Structure", "Other"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");

    if (!orgId) {
      return Response.json({ error: "Missing org_id query parameter" }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, phone, job_types, photo_urls } = body;

    // Validate required fields
    if (!name || !email || !phone) {
      return Response.json({ error: "Missing required fields: name, email, phone" }, { status: 400 });
    }

    // Map job type — accept array or string, use first value
    const rawJobType = Array.isArray(job_types) ? job_types[0] : job_types;
    const jobType = rawJobType && VALID_JOB_TYPES.includes(rawJobType) ? rawJobType : "Other";

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
        type: "Homeowner",
        organization_id: orgId
      });
    }

    // Generate a job number
    const year = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
    const jobNumber = `HCMW-${year}-${seq}`;

    const now = new Date().toISOString();
    const jobName = `${name} — ${jobType === "Other" ? "Quote Request" : jobType}`;

    // Build photo storage object if any URLs were provided
    const sitePhotos = (Array.isArray(photo_urls) && photo_urls.length > 0)
      ? { before: photo_urls.map(u => ({ url: u })) }
      : undefined;

    const job = await base44.asServiceRole.entities.Job.create({
      organization_id: orgId,
      job_number: jobNumber,
      customer_id: customer.id,
      customer_name: name,
      job_name: jobName,
      job_type: jobType,
      lead_customer_phone: phone,
      lead_customer_email: email,
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
        note: `Lead submitted via GoHighLevel webhook. Phone: ${phone}. Email: ${email}. Job types: ${Array.isArray(job_types) ? job_types.join(", ") : (job_types || "N/A")}.`
      }],
      job_level_data: sitePhotos ? { site_photos: sitePhotos } : undefined
    });

    // In-app notification
    await base44.asServiceRole.entities.Notification.create({
      organization_id: orgId,
      title: `New Lead: ${name}`,
      body: `Website lead from ${name}. Phone: ${phone}. Email: ${email}. Project: ${jobType}.`,
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