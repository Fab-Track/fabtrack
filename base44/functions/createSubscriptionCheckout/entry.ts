import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

/**
 * Stripe Price ID mapping per plan tier.
 * Update these PLACEHOLDERS with real Stripe Price IDs from your dashboard.
 * Base price = flat monthly fee. Metered price = per-user monthly add-on.
 */
const PLAN_PRICES = {
  starter: {
    base: 'price_starter_base_monthly',        // PLACEHOLDER
    metered: 'price_starter_per_user_monthly', // PLACEHOLDER
  },
  professional: {
    base: 'price_professional_base_monthly',        // PLACEHOLDER
    metered: 'price_professional_per_user_monthly', // PLACEHOLDER
  },
  enterprise: {
    base: 'price_enterprise_base_monthly',        // PLACEHOLDER
    metered: 'price_enterprise_per_user_monthly', // PLACEHOLDER
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/admins can subscribe their org
    const userRoles = user.roles || [];
    if (!userRoles.includes('owner') && !userRoles.includes('admin')) {
      return Response.json({ error: 'Only org owners/admins can manage subscriptions' }, { status: 403 });
    }

    const body = await req.json();
    const { plan } = body;

    if (!plan || !['starter', 'professional', 'enterprise'].includes(plan)) {
      return Response.json({ error: 'Valid plan (starter/professional/enterprise) is required' }, { status: 400 });
    }

    const orgId = user.organization_id;
    if (!orgId) {
      return Response.json({ error: 'No organization associated with your account' }, { status: 400 });
    }

    const org = await base44.asServiceRole.entities.Organization.get(orgId);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const prices = PLAN_PRICES[plan];
    if (!prices?.base) {
      return Response.json({ error: `Plan "${plan}" pricing is not configured` }, { status: 500 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);

    // Get or create Stripe Customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: org.email || user.email,
        metadata: { organization_id: org.id, organization_slug: org.slug },
      });
      customerId = customer.id;
      await base44.asServiceRole.entities.Organization.update(org.id, {
        stripe_customer_id: customerId,
      });
    }

    const origin = req.headers.get('origin') || 'https://fabtrack.app';

    const lineItems = [{ price: prices.base, quantity: 1 }];
    if (prices.metered) {
      lineItems.push({ price: prices.metered });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      metadata: {
        organization_id: org.id,
        organization_slug: org.slug,
        plan,
        billing_type: 'platform_subscription',
      },
      success_url: `${origin}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?billing=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          organization_id: org.id,
          organization_slug: org.slug,
          plan,
        },
      },
    });

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});