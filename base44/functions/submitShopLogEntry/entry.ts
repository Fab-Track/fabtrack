import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { recalcShopLogTotals } from '../../shared/shopLog.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { share_token, entry_date, shop_labor_hours, install_labor_hours,
      materials_cost, powder_coat_cost, draw_measure_hours, fuel_cost, submitted_by_name } = body;

    if (!share_token) {
      return Response.json({ error: 'Missing share_token' }, { status: 400 });
    }

    // Resolve the job from the opaque token — never accept a raw job_id from the public path.
    const jobs = await base44.asServiceRole.entities.Job.filter({ shop_log_share_token: share_token });
    const job = jobs[0];
    if (!job) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    // Probe: just resolve job info for the public form header (no entry created)
    if (body._probe) {
      return Response.json({ job_name: job.job_name, job_number: job.job_number });
    }

    // Create the entry using service role (public, no auth)
    await base44.asServiceRole.entities.ShopLogEntry.create({
      organization_id: job.organization_id,
      job_id: job.id,
      job_number: job.job_number || '',
      entry_date: entry_date || new Date().toISOString().slice(0, 10),
      shop_labor_hours: Number(shop_labor_hours) || 0,
      install_labor_hours: Number(install_labor_hours) || 0,
      materials_cost: Number(materials_cost) || 0,
      powder_coat_cost: Number(powder_coat_cost) || 0,
      draw_measure_hours: Number(draw_measure_hours) || 0,
      fuel_cost: Number(fuel_cost) || 0,
      submitted_by_name: submitted_by_name || ''
    });

    // Roll up totals on the job
    const totals = await recalcShopLogTotals(base44.asServiceRole, job.id);

    return Response.json({ success: true, job_name: job.job_name, job_number: job.job_number, totals });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}