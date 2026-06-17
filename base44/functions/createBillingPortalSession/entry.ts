import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

/**
 * Creates a Stripe Customer Portal session so the org owner can:
 *  - Update payment method
 *  - View/download invoices
 *  - Cancel subscription
 *  - Switch plans (if configured in Stripe Portal settings)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = user.roles || [];
    if (!userRoles.includes('owner') && !userRoles.includes('admin')) {
      return Response.json({ error: 'Only org owners/admins can access billing' }, { status: 403 });
    }

    const orgId = user.organization_id;
    if (!orgId) {
      return Response.json({ error: 'No organization associated with your account' }, { status: 400 });
    }

    const org = await base44.asServiceRole.entities.Organization.get(orgId);
    if (!org?.stripe_customer_id) {
      return Response.json({
        error: 'No billing account found. Please subscribe to a plan first.',
        needs_subscription: true,
      }, { status: 400 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const origin = req.headers.get('origin') || '';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    return Response.json({
      success: true,
      portal_url: portalSession.url,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});