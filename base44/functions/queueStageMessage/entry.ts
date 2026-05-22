import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STAGE_QUEUE_MAP = {
  "New Lead": "New Lead Response",
  "Estimate Sent": "Estimate Sent",
  "Deposit Received / Sale Won": "Deposit Received / Sale Won",
  "On Deck for Measure": "Measure Appointment Scheduling",
  "Install in Progress / Not Complete": "Install Date Confirmation",
  "Install Complete": "Install Complete",
  "2nd Half Invoice Sent": "Invoice Sent",
  "10 Days Overdue": "Payment Reminder (10 Days Overdue)",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const job_id = body.job_id || body.event?.entity_id || body.data?.id;
    const stage = body.stage || body.data?.stage;

    if (!job_id || !stage) return Response.json({ ok: true, skipped: true, reason: "no job_id or stage" });

    const templateName = STAGE_QUEUE_MAP[stage];
    if (!templateName) return Response.json({ ok: true, skipped: true, reason: "no template for this stage" });

    // Look up the template
    const templates = await base44.asServiceRole.entities.MessageTemplate.filter({ name: templateName });
    const template = templates[0];
    if (!template) return Response.json({ ok: true, skipped: true, reason: "template not found: " + templateName });

    // Get job details
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    if (!job) return Response.json({ ok: false, reason: "job not found" });

    // Check for existing queued message for this job + stage to avoid duplicates
    const existing = await base44.asServiceRole.entities.CommMessage.filter({ job_id, status: "queued", template_name: templateName });
    if (existing.length > 0) return Response.json({ ok: true, skipped: true, reason: "already queued" });

    // Default channel preference: SMS if both available
    const channel = template.channel === "Email" ? "Email" : "SMS";
    const body_text = channel === "SMS" ? (template.sms_body || template.email_body) : (template.email_body || template.sms_body);

    await base44.asServiceRole.entities.CommMessage.create({
      job_id: job.id,
      job_number: job.job_number,
      job_name: job.job_name,
      customer_name: job.customer_name,
      channel,
      status: "queued",
      to_name: job.customer_name,
      to_phone: job.lead_customer_phone || "",
      to_email: job.lead_customer_email || "",
      subject: template.subject || "",
      body: body_text || "",
      template_id: template.id,
      template_name: template.name,
      queued_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, queued: templateName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});