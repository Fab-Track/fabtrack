import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scheduled daily: auto-advance Billing board cards through overdue stages
 * and send notifications for each escalation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role — this is a scheduled/admin function
    const jobs = await base44.asServiceRole.entities.Job.filter({ pipeline_board: "Billing" });
    const billingJobs = jobs.filter(j => j.stage !== "Paid / Closed" && j.stage !== "Needs 2nd Half Invoice Created");

    const now = new Date();
    const updates = [];

    for (const job of billingJobs) {
      if (!job.invoice_sent_date) continue;

      const sentDate = new Date(job.invoice_sent_date);
      const days = Math.floor((now - sentDate) / (1000 * 60 * 60 * 24));

      let targetStage = job.stage;
      if (days >= 30) targetStage = "30+ Days Overdue";
      else if (days >= 30) targetStage = "30 Days Overdue";
      else if (days >= 20) targetStage = "20 Days Overdue";
      else if (days >= 15) targetStage = "15 Days Overdue";
      else if (days >= 10) targetStage = "10 Days Overdue";
      else targetStage = "2nd Half Invoice Sent";

      if (targetStage !== job.stage) {
        const historyEntry = {
          from_board: "Billing",
          to_board: "Billing",
          from_stage: job.stage,
          to_stage: targetStage,
          timestamp: now.toISOString(),
          note: `Auto-advanced by system: ${days} days since invoice sent.`,
        };

        await base44.asServiceRole.entities.Job.update(job.id, {
          stage: targetStage,
          stage_entered_at: now.toISOString(),
          stage_history: [...(job.stage_history || []), historyEntry],
          last_activity_date: now.toISOString(),
        });

        updates.push({ job_number: job.job_number, from: job.stage, to: targetStage });

        // In-app notification (no email credits used)
        await base44.asServiceRole.entities.Notification.create({
          title: `Overdue Invoice: ${job.customer_name}`,
          body: `${job.customer_name} — ${job.job_name} is now ${days} days past invoice sent date. Stage: ${targetStage}`,
          type: "overdue_invoice",
          link: `/jobs/${job.id}`,
          is_read: false,
          target_roles: ["admin", "owner", "estimator"],
        });
      }
    }

    return Response.json({ processed: billingJobs.length, advanced: updates.length, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});