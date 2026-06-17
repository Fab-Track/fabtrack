import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

/**
 * Reports the current active-user count to Stripe for metered billing.
 *
 * Called on a schedule or after user add/remove events.
 * Updates the org's active_user_count cache and pushes a usage record
 * to the metered subscription item in Stripe.
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId) {
      return Response.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);

    const org = await base44.asServiceRole.entities.Organization.get(organizationId);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!org.stripe_subscription_id) {
      return Response.json({
        success: true,
        message: 'No active subscription to report usage for',
        userCount: 0,
      });
    }

    // Count active users in this org
    const users = await base44.asServiceRole.entities.User.filter({
      organization_id: organizationId,
      account_status: 'active',
    });
    const userCount = users.length;

    // Update cached count on org
    await base44.asServiceRole.entities.Organization.update(organizationId, {
      active_user_count: userCount,
    });

    const stripe = new Stripe(stripeKey);

    // Find the metered subscription item (per-user pricing)
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
      expand: ['items.data.price'],
    });

    let meteredItem = null;
    for (const item of subscription.items.data) {
      if (item.price?.recurring?.usage_type === 'metered') {
        meteredItem = item;
        break;
      }
    }

    if (!meteredItem) {
      return Response.json({
        success: true,
        message: 'No metered subscription item found — user count cached only',
        userCount,
      });
    }

    // Report usage to Stripe (timestamp = now, quantity = active user count)
    await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
      quantity: userCount,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'set',
    });

    return Response.json({
      success: true,
      message: `Reported ${userCount} active users to Stripe metered billing`,
      userCount,
      subscriptionItemId: meteredItem.id,
    });
  } catch (error) {
    console.error('syncPlanUsage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});