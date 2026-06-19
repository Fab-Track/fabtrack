import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STAGE_MESSAGES = {
  "Deposit Received / Sale Won": "✅ Deposit received — job moved to Shop Flow",
  "In Fabrication": "🔨 Job moved to In Fabrication",
  "Powder Coat": "🎨 Job moved to Powder Coat",
  "Ready for Install": "📦 Ready for Install",
  "Install Complete": "✓ Install Complete",
  "Paid / Closed": "💰 Final invoice paid — job closing in 90 days",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Support both direct call and entity automation payload
    const job_id = body.job_id || body.event?.entity_id || body.data?.id;
    const stage = body.stage || body.data?.stage;

    if (!job_id || !stage) {
      return Response.json({ ok: true, skipped: true, reason: "missing job_id or stage" });
    }

    const systemMsg = STAGE_MESSAGES[stage];
    if (!systemMsg) return Response.json({ ok: true, skipped: true });

    // Find the job's channel
    const channels = await base44.asServiceRole.entities.MessageChannel.filter({ job_id });
    if (channels.length === 0) return Response.json({ ok: true, no_channel: true });

    const channel = channels[0];

    await base44.asServiceRole.entities.Message.create({
      organization_id: channel.organization_id,
      channel_id: channel.id,
      sender_id: "system",
      sender_name: "FabTrack",
      content: systemMsg,
      is_system: true,
    });

    await base44.asServiceRole.entities.MessageChannel.update(channel.id, {
      last_message_at: new Date().toISOString(),
      last_message_preview: systemMsg,
    });

    // Handle "Paid / Closed" — set paid_at for 90-day archive countdown
    if (stage === "Paid / Closed") {
      await base44.asServiceRole.entities.MessageChannel.update(channel.id, {
        paid_at: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});