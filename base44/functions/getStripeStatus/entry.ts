import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = user.roles || [];
    if (!userRoles.includes('owner') && !userRoles.includes('admin')) {
      return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
    const existing = settings.length > 0 ? settings[0] : null;

    return Response.json({
      is_connected: existing?.stripe_is_connected || false,
      mode: existing?.stripe_mode || '',
      connected_at: existing?.stripe_connected_at || null,
      has_secret_key: !!existing?.stripe_secret_key,
      has_webhook_secret: !!existing?.stripe_webhook_secret,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});