import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Find leads with follow_up_date <= today that haven't been notified yet
    const dueJobs = await base44.asServiceRole.entities.Job.filter({
      is_lead_closed: true,
      follow_up_notified: false,
    });

    const now = new Date();
    const triggered = [];

    for (const job of dueJobs) {
      if (!job.follow_up_date) continue;
      try {
        const followDate = new Date(job.follow_up_date);
        // Only trigger if follow-up date is today or past
        if (followDate.toISOString().split('T')[0] <= todayStr) {
          // Create notification
          await base44.asServiceRole.entities.Notification.create({
            title: `Follow-Up Reminder: ${job.job_name}`,
            body: `It's time to follow up on "${job.job_name}" (${job.job_number || 'no #'}). The lead was put on hold with a follow-up scheduled for ${job.follow_up_date}.`,
            type: "info",
            link: `/jobs/${job.id}`,
            is_read: false,
            target_roles: ["owner", "admin", "estimator"],
          });

          // Mark as notified
          await base44.asServiceRole.entities.Job.update(job.id, {
            follow_up_notified: true,
          });

          triggered.push({ id: job.id, name: job.job_name, follow_up_date: job.follow_up_date });
        }
      } catch { /* skip individual failures */ }
    }

    return Response.json({ success: true, triggered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});