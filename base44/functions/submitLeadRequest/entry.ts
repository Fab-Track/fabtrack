import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { first_name, last_name, business_name, email, phone, submitted_at } = body;

    // Save the lead request
    const record = await base44.asServiceRole.entities.LeadRequest.create({
      first_name,
      last_name,
      business_name,
      email,
      phone: phone || null,
      submitted_at: submitted_at || new Date().toISOString(),
    });

    // Best-effort email notification (may fail if recipient is not an app user)
    const emailBody = [
      "New access request submitted on FabTrack:",
      "",
      `Name: ${first_name} ${last_name}`,
      `Business: ${business_name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : "Phone: (not provided)",
      "",
      `Submitted at: ${submitted_at || new Date().toISOString()}`,
    ].join("\n");

    let emailSent = false;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: "info@fab-track.io",
        subject: `New Access Request — ${business_name}`,
        body: emailBody,
      });
      emailSent = true;
    } catch (emailErr) {
      // Email may fail if recipient isn't a registered app user; lead is still saved
      console.log("Email notification failed:", emailErr.message);
    }

    return Response.json({ success: true, id: record.id, email_sent: emailSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});