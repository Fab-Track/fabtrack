import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getQboContext, qboQuery } from '../../shared/qbo.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await getQboContext(base44);
    const { Item: items = [] } = await qboQuery(
      ctx,
      "select Id, Name, Type, Active from Item where Active = true orderby Name maxresults 1000"
    );

    return Response.json({
      items: items.map((i) => ({ id: i.Id, name: i.Name, type: i.Type })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}