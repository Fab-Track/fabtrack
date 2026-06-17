import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

/**
 * Fetches the org's billing details from Stripe.
 * Returns: plan, status, MRR, next billing date, payment method, recent invoices.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = user.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');
    const isOrgAdmin = userRoles.includes('owner') || userRoles.includes('admin');

    if (!isSuperAdmin && !isOrgAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    let orgId = body.organizationId || user.organization_id;

    if (isSuperAdmin && !orgId) {
      return Response.json({ error: 'organizationId is required for super admin queries' }, { status: 400 });
    }
    if (!orgId) {
      return Response.json({ error: 'No organization associated with your account' }, { status: 400 });
    }

    const org = await base44.asServiceRole.entities.Organization.get(orgId);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey || !org.stripe_customer_id) {
      return Response.json({
        success: true,
        org: {
          id: org.id,
          name: org.name,
          plan: org.plan,
          subscription_status: org.subscription_status,
          userCount: org.active_user_count || 0,
          subscription_period_end: org.subscription_period_end || null,
        },
        stripe_configured: !!stripeKey,
        has_stripe_customer: !!org.stripe_customer_id,
        subscription: null,
        payment_method: null,
        invoices: [],
      });
    }

    const stripe = new Stripe(stripeKey);

    // Fetch subscription
    let subscription = null;
    let paymentMethod = null;
    let invoices = [];

    if (org.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
          expand: ['items.data.price', 'latest_invoice.payment_intent'],
        });

        // Fetch payment method from the subscription's default
        if (subscription.default_payment_method) {
          const pm = await stripe.paymentMethods.retrieve(
            typeof subscription.default_payment_method === 'string'
              ? subscription.default_payment_method
              : subscription.default_payment_method.id
          );
          paymentMethod = {
            brand: pm.card?.brand || pm.type,
            last4: pm.card?.last4 || '',
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
          };
        }
      } catch (subErr) {
        console.error('Failed to fetch subscription:', subErr.message);
      }
    }

    // Fetch recent invoices
    if (org.stripe_customer_id) {
      try {
        const invList = await stripe.invoices.list({
          customer: org.stripe_customer_id,
          limit: 12,
          status: 'paid',
        });
        invoices = invList.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          amount_paid: inv.amount_paid / 100,
          currency: inv.currency,
          status: inv.status,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          hosted_url: inv.hosted_invoice_url,
          pdf_url: inv.invoice_pdf,
        }));
      } catch (invErr) {
        console.error('Failed to fetch invoices:', invErr.message);
      }
    }

    // Calculate active user count for display
    let userCount = org.active_user_count || 0;
    if (!userCount) {
      const users = await base44.asServiceRole.entities.User.filter({
        organization_id: orgId,
        account_status: 'active',
      });
      userCount = users.length;
    }

    return Response.json({
      success: true,
      org: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        subscription_status: org.subscription_status,
        subscription_period_end: org.subscription_period_end || null,
        userCount,
      },
      stripe_configured: true,
      has_stripe_customer: true,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString() : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        items: subscription.items.data.map((item) => ({
          id: item.id,
          price_id: item.price?.id,
          unit_amount: item.price?.unit_amount ? item.price.unit_amount / 100 : null,
          recurring_interval: item.price?.recurring?.interval,
          quantity: item.quantity,
          usage_type: item.price?.recurring?.usage_type || 'licensed',
        })),
      } : null,
      payment_method: paymentMethod,
      invoices,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});