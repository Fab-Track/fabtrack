import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find job channels that have been paid and are past the 90-day window
    const channels = await base44.asServiceRole.entities.MessageChannel.filter({
      channel_type: "job",
      is_archived: false,
    });

    const now = new Date();
    const archived = [];

    for (const ch of channels) {
      if (!ch.paid_at) continue;
      const paidDate = new Date(ch.paid_at);
      const daysSince = (now - paidDate) / 86400000;
      if (daysSince >= 90) {
        await base44.asServiceRole.entities.MessageChannel.update(ch.id, {
          is_archived: true,
          archived_at: now.toISOString(),
        });
        archived.push(ch.name);
      }
    }

    return Response.json({ ok: true, archived: archived.length, channels: archived });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});