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

    if (!org.stripe_account_id) {
      return Response.json({ status: 'not_connected', charges_enabled: false, details_submitted: false });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    const account = await stripe.accounts.retrieve(org.stripe_account_id);

    const chargesEnabled = !!account.charges_enabled;
    const detailsSubmitted = !!account.details_submitted;

    let status = 'restricted';
    if (chargesEnabled) status = 'active';
    else if (detailsSubmitted) status = 'pending';
    else status = 'pending';

    const updateData = {
      stripe_connect_status: status,
      stripe_charges_enabled: chargesEnabled,
    };
    if (status === 'active' && !org.stripe_connected_at) {
      updateData.stripe_connected_at = new Date().toISOString();
    }
    await base44.asServiceRole.entities.Organization.update(org.id, updateData);

    return Response.json({
      status,
      charges_enabled: chargesEnabled,
      details_submitted: detailsSubmitted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});