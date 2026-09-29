import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { recalcShopLogTotals } from '../../shared/shopLog.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { job_id } = body;
    if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });

    // User-scoped call respects RLS — only org members can recalc
    const totals = await recalcShopLogTotals(base44, job_id);
    return Response.json({ success: true, totals });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}