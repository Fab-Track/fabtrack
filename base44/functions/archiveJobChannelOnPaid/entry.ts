import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Entity automation: when a job's stage changes to "Paid / Closed", 
 * archive the associated job channel and post a final system message.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse payload from entity automation
    const payload = await req.json();
    const { event, data: job, changed_fields } = payload;

    if (!job || !job.id) {
      return Response.json({ ok: false, reason: "No job data" }, { status: 400 });
    }

    // Only act when stage changed to Paid / Closed
    if (!changed_fields?.includes("stage")) {
      return Response.json({ ok: false, reason: "Stage not changed" });
    }

    if (job.stage !== "Paid / Closed") {
      return Response.json({ ok: false, reason: `Stage is ${job.stage}, not Paid / Closed` });
    }

    // Find the job channel
    const channels = await base44.asServiceRole.entities.MessageChannel.filter({
      job_id: job.id,
      channel_type: "job",
      is_archived: false,
    });

    const now = new Date().toISOString();

    for (const ch of channels) {
      // Post final system message
      await base44.asServiceRole.entities.Message.create({
        organization_id: ch.organization_id,
        channel_id: ch.id,
        content: "✅ Job marked as Paid/Closed — channel archived.",
        sender_id: "system",
        sender_name: "FabTrack",
        is_system: true,
      });

      // Update channel last_message
      await base44.asServiceRole.entities.MessageChannel.update(ch.id, {
        is_archived: true,
        archived_at: now,
        paid_at: now,
        last_message_at: now,
        last_message_preview: "✅ Job marked as Paid/Closed — channel archived.",
      });
    }

    return Response.json({ ok: true, archived: channels.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});