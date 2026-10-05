import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Old → New Sales stage migration mapping
const STAGE_MIGRATION_MAP = {
  "New Lead":                          "New Inquiry",
  "Website Form New Lead":             "New Inquiry",
  "Manual New Lead":                   "New Inquiry",
  "Customer Contacted":                "Qualifying",
  "Estimate in Progress":              "Estimating",
  "Estimate In Progress":              "Estimating",
  "Estimate In Progress - Waiting on Customer": "Estimating",
  "Estimate Sent - Budget Stage":      "Estimate Sent",
  "Estimate Sent":                     "Estimate Sent",
  "Negotiation / In Review":           "Negotiating",
  "In Review":                         "Negotiating",
  "Awaiting Deposit":                 "Awaiting Deposit",
  "Deposit Received / Sale Won":       "Won",
  "Deposit Received":                  "Won",
  "Sale Won":                          "Won",
};

const MIGRATION_BLOCKER_MAP = {
  "Estimate In Progress - Waiting on Customer": ["Waiting on Customer"],
  "Estimate Sent - Budget Stage": ["Waiting on Budget"],
};

const NEW_SALES_STAGES = [
  "New Inquiry", "Qualifying", "Estimating", "Pricing Review",
  "Estimate Sent", "Negotiating", "Awaiting Deposit", "Won",
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only admins/owners can run migration
    const role = (user.role || '').toLowerCase();
    if (!['admin', 'owner', 'super_admin'].includes(role)) {
      return Response.json({ error: 'Forbidden — admin or owner access required' }, { status: 403 });
    }

    const orgId = user.data?.organization_id || user.organization_id;
    if (!orgId) return Response.json({ error: 'No organization context' }, { status: 400 });

    // Fetch all Sales board jobs for this org (paginated)
    let allJobs = [];
    let cursor = null;
    do {
      const page = await base44.asServiceRole.entities.Job.list('-created_date', 500);
      const filtered = (page.items || []).filter(j => (j.pipeline_board || 'Sales') === 'Sales');
      allJobs = allJobs.concat(filtered);
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);

    const migrated = [];
    const unmappable = [];
    const skipped = [];

    for (const job of allJobs) {
      // Skip closed leads — they stay in Closed Leads
      if (job.is_lead_closed) {
        skipped.push({ id: job.id, job_number: job.job_number, reason: 'Closed lead — skipped' });
        continue;
      }

      const oldStage = job.stage || 'New Lead';

      // Already on a new stage — skip
      if (NEW_SALES_STAGES.includes(oldStage)) {
        skipped.push({ id: job.id, job_number: job.job_number, reason: 'Already on new stage' });
        continue;
      }

      const newStage = STAGE_MIGRATION_MAP[oldStage];
      if (!newStage) {
        unmappable.push({ id: job.id, job_number: job.job_number, old_stage: oldStage });
        continue;
      }

      // Build update payload
      const update = {
        stage: newStage,
        stage_entered_at: new Date().toISOString(),
        last_activity_date: new Date().toISOString(),
      };

      // Add blockers from migration map
      const migrationBlockers = MIGRATION_BLOCKER_MAP[oldStage] || [];
      if (migrationBlockers.length > 0) {
        const existingBlockers = job.lead_blockers || [];
        const merged = [...new Set([...existingBlockers, ...migrationBlockers])];
        update.lead_blockers = merged;
      }

      // Add migration note to stage history
      const historyEntry = {
        from_board: 'Sales',
        to_board: 'Sales',
        from_stage: oldStage,
        to_stage: newStage,
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_name: user.full_name || user.displayName || '',
        note: 'Automated migration: ' + oldStage + ' → ' + newStage,
      };
      update.stage_history = [...(job.stage_history || []), historyEntry];

      // Preserve original source (don't overwrite lead_source)
      // Size band auto-derive from estimate_total if present
      if (job.estimate_total && !job.size_band) {
        const amt = job.estimate_total;
        if (amt < 5000) update.size_band = 'Under $5K';
        else if (amt < 10000) update.size_band = '$5K–$10K';
        else if (amt < 25000) update.size_band = '$10K–$25K';
        else if (amt < 50000) update.size_band = '$25K–$50K';
        else update.size_band = '$50K+';
      }

      try {
        await base44.asServiceRole.entities.Job.update(job.id, update);
        migrated.push({ id: job.id, job_number: job.job_number, old_stage: oldStage, new_stage: newStage });
      } catch (err) {
        unmappable.push({ id: job.id, job_number: job.job_number, old_stage: oldStage, error: err.message });
      }
    }

    return Response.json({
      success: true,
      total: allJobs.length,
      migrated: migrated.length,
      unmappable: unmappable.length,
      skipped: skipped.length,
      unmappable_details: unmappable,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}