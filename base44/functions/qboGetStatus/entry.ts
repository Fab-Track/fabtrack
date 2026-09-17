import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getQboContext, qboQuery } from '../../shared/qbo.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let ctx;
    try {
      ctx = await getQboContext(base44);
    } catch (e) {
      return Response.json({ connected: false, error: e.message });
    }

    let companyName = null;
    try {
      const { CompanyInfo = [] } = await qboQuery(ctx, "select * from CompanyInfo");
      companyName = CompanyInfo[0]?.CompanyName || null;
    } catch (_e) {
      return Response.json({ connected: false, realm_id: ctx.realmId, error: 'Could not reach QuickBooks with the current connection.' });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'qbo_sync' });
    return Response.json({
      connected: true,
      realm_id: ctx.realmId,
      company_name: companyName,
      last_poll_at: settings[0]?.qbo_last_poll_at || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}