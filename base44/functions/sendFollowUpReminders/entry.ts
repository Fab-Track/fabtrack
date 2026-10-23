import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendOrgEmailViaResend, isEmailConfigured, getOrgEmailConfig } from '../../shared/email.js';

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

    // Pre-fetch email config once to avoid repeated lookups per job
    let emailConfig = null;
    try {
      emailConfig = await getOrgEmailConfig(base44, user.organization_id);
    } catch { /* non-fatal */ }

    const now = new Date();
    const triggered = [];

    for (const job of dueJobs) {
      if (!job.follow_up_date) continue;
      try {
        const followDate = new Date(job.follow_up_date);
        // Only trigger if follow-up date is today or past
        if (followDate.toISOString().split('T')[0] <= todayStr) {
          // Create in-app notification
          await base44.asServiceRole.entities.Notification.create({
            title: `Follow-Up Reminder: ${job.job_name}`,
            body: `It's time to follow up on "${job.job_name}" (${job.job_number || 'no #'}). The lead was put on hold with a follow-up scheduled for ${job.follow_up_date}.`,
            type: "info",
            link: `/jobs/${job.id}`,
            is_read: false,
            target_roles: ["owner", "admin", "estimator"],
          });

          // Send email reminder to assigned rep + estimator (if email is configured)
          if (isEmailConfigured(emailConfig)) {
            const recipients = new Set();
            const repId = job.assigned_rep_id;
            const estId = job.assigned_estimator;
            for (const uid of [repId, estId]) {
              if (!uid) continue;
              try {
                const u = await base44.asServiceRole.entities.User.get(uid);
                if (u?.email) recipients.add(u.email);
              } catch { /* non-fatal */ }
            }
            // Also notify org owners/admins
            try {
              const orgUsers = await base44.asServiceRole.entities.User.filter(
                { organization_id: job.organization_id }, '-created_date', 200
              );
              for (const u of orgUsers || []) {
                const roles = u.roles || (u.role ? [u.role] : []);
                if ((roles.includes('owner') || roles.includes('admin')) && u.email) {
                  recipients.add(u.email);
                }
              }
            } catch { /* non-fatal */ }

            const jobLink = job.id ? `https://fab-track.base44.app/jobs/${job.id}` : '';
            for (const email of recipients) {
              try {
                await sendOrgEmailViaResend(base44, job.organization_id, {
                  to: email,
                  subject: `Follow-Up Reminder: ${job.job_name}`,
                  html: `<p>This is a reminder to follow up on <strong>${job.job_name}</strong> (${job.job_number || 'no #'}).</p>` +
                        `<p>The lead was put on hold with a follow-up scheduled for ${job.follow_up_date}.</p>` +
                        (jobLink ? `<p><a href="${jobLink}">View the job →</a></p>` : '') +
                        `<p style="color:#888;font-size:12px;">This is an automated reminder from FabTrack.</p>`,
                  purpose: 'notification',
                });
              } catch { /* non-fatal — in-app notification already created */ }
            }
          }

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