import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

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

    const body = await req.json();
    const { stripe_secret_key, stripe_webhook_secret } = body;

    // Handle disconnect: clear all Stripe settings
    const isDisconnect = (!stripe_secret_key || stripe_secret_key.trim() === '');
    if (isDisconnect) {
      const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
      const existing = settings.length > 0 ? settings[0] : null;
      if (existing) {
        await base44.asServiceRole.entities.AppSettings.update(existing.id, {
          stripe_secret_key: '',
          stripe_webhook_secret: '',
          stripe_is_connected: false,
          stripe_mode: '',
        });
      }
      return Response.json({ success: true, disconnected: true });
    }

    // Validate the key by making a test API call
    const stripe = new Stripe(stripe_secret_key);
    let mode = '';
    try {
      await stripe.balance.retrieve();
      mode = stripe_secret_key.startsWith('sk_live_') ? 'live' : 'test';
    } catch (stripeErr) {
      return Response.json({
        error: `Stripe key validation failed: ${stripeErr.message}`,
        valid: false,
      }, { status: 400 });
    }

    // Save to AppSettings
    const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
    const existing = settings.length > 0 ? settings[0] : null;

    const data = {
      stripe_secret_key,
      stripe_is_connected: true,
      stripe_connected_at: new Date().toISOString(),
      stripe_mode: mode,
    };

    if (stripe_webhook_secret && stripe_webhook_secret.trim() !== '') {
      data.stripe_webhook_secret = stripe_webhook_secret;
    }

    if (existing) {
      await base44.asServiceRole.entities.AppSettings.update(existing.id, data);
    } else {
      await base44.asServiceRole.entities.AppSettings.create({
        setting_key: 'main',
        ...data,
      });
    }

    return Response.json({
      success: true,
      mode,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});