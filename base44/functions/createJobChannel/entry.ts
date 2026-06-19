import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function jobChannelSlug(jobNumber, jobName) {
  const numPart = (jobNumber || "").toLowerCase();
  const words = (jobName || "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map(w => w.toLowerCase())
    .filter(Boolean);
  return `#${numPart}-${words.join("-")}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Support both direct call (job_id) and entity automation payload (event.entity_id or data.id)
    const job_id = body.job_id || body.event?.entity_id || body.data?.id;
    if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });

    // Use service role for all operations (handles both user and automation contexts)
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    // Check if channel already exists for this job
    const existing = await base44.asServiceRole.entities.MessageChannel.filter({ job_id });
    if (existing.length > 0) return Response.json({ ok: true, channel: existing[0], already_existed: true });

    const slug = jobChannelSlug(job.job_number, job.job_name);
    const displayName = job.job_number + " — " + (job.job_name || "").replace(/[^a-zA-Z0-9\s\-]/g, "").trim().split(/\s+/).slice(0,4).join(" ");

    // Build member_ids: assigned estimator + crew
    const memberIds = [];
    if (job.assigned_estimator) memberIds.push(job.assigned_estimator);
    if (job.assigned_crew?.length) memberIds.push(...job.assigned_crew);

    const orgId = job.organization_id;
    const channel = await base44.asServiceRole.entities.MessageChannel.create({
      organization_id: orgId,
      name: slug,
      display_name: displayName,
      description: `Job channel for ${job.job_number} — ${job.job_name}`,
      channel_type: "job",
      is_permanent: false,
      job_id: job.id,
      job_number: job.job_number,
      member_roles: ["admin", "owner", "shop_manager"],
      member_ids: memberIds,
      is_archived: false,
      sort_order: 100,
    });

    // Post system message
    await base44.asServiceRole.entities.Message.create({
      organization_id: orgId,
      channel_id: channel.id,
      sender_id: "system",
      sender_name: "FabTrack",
      content: `📋 Job channel created — ${job.job_number} "${job.job_name}" moved to Shop Flow`,
      is_system: true,
    });

    return Response.json({ ok: true, channel });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});