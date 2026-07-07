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

    const orgId = user.organization_id;
    if (!orgId) {
      return Response.json({ error: 'No organization associated with your account' }, { status: 400 });
    }

    const org = await base44.asServiceRole.entities.Organization.get(orgId);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);

    let accountId = org.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: org.email || user.email,
        metadata: { organization_id: org.id, organization_slug: org.slug },
      });
      accountId = account.id;
      await base44.asServiceRole.entities.Organization.update(org.id, {
        stripe_account_id: accountId,
        stripe_connect_status: 'pending',
      });
    }

    const origin = req.headers.get('origin') || 'https://fabtrack.app';
    const returnUrl = `${origin}/settings?stripe_connect=return`;
    const refreshUrl = `${origin}/settings?stripe_connect=refresh`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: 'account_onboarding',
    });

    return Response.json({
      success: true,
      url: accountLink.url,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});