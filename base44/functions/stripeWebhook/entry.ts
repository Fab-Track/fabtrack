import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    // Read Stripe keys from AppSettings first (multi-tenant), fall back to env vars
    let stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    let webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const base44 = createClient({
      appId: Deno.env.get('BASE44_APP_ID'),
      env: 'production',
    });

    try {
      const settings = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main' });
      if (settings.length > 0) {
        if (settings[0].stripe_secret_key) stripeSecretKey = settings[0].stripe_secret_key;
        if (settings[0].stripe_webhook_secret) webhookSecret = settings[0].stripe_webhook_secret;
      }
    } catch { /* fall back to env vars */ }

    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe secret key not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    if (!webhookSecret) {
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Read the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Verify webhook signature using async crypto (Deno uses Web Crypto API)
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      return Response.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
    }

    // ── PLATFORM SUBSCRIPTION EVENTS (billing_type = platform_subscription) ──
    // checkout.session.completed with billing_type=platform_subscription
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const billingType = session.metadata?.billing_type;

      // Platform subscription billing (org subscribing to FabTrack)
      if (billingType === 'platform_subscription') {
        const orgId = session.metadata?.organization_id;
        const plan = session.metadata?.plan;
        const subscriptionId = session.subscription;

        if (!orgId || !subscriptionId) {
          return Response.json({ error: 'Missing org or subscription in session metadata' }, { status: 400 });
        }

        const sub = subscriptionId && typeof subscriptionId === 'string'
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : null;

        await base44.asServiceRole.entities.Organization.update(orgId, {
          stripe_subscription_id: subscriptionId,
          plan: plan || undefined,
          subscription_status: 'active',
          subscription_period_end: sub?.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
          last_billing_sync_at: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.SuperAdminAuditLog.create({
          admin_email: 'system@fabtrack',
          admin_name: 'Stripe Webhook',
          action_type: 'subscription_created',
          organization_id: orgId,
          action_detail: `Subscription "${subscriptionId}" created via Stripe Checkout for plan "${plan}"`,
        });

        return Response.json({ received: true, type: 'subscription_created', org_id: orgId });
      }

      // Legacy invoice payment (shop collecting from customer)
      const invoiceId = session.metadata?.invoice_id;
      if (!invoiceId) {
        return Response.json({ received: true, event: event.type });
      }

      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
      if (!invoice) {
        return Response.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const paymentAmount = session.amount_total / 100;
      const newAmountPaid = (invoice.amount_paid || 0) + paymentAmount;
      const newBalanceDue = Math.max(0, invoice.total - newAmountPaid);
      let newStatus = 'Paid';
      if (newBalanceDue > 0.01) newStatus = 'Partial';

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Invoice.update(invoiceId, {
        status: newStatus,
        payment_method: 'Stripe',
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        paid_date: now.split('T')[0],
      });

      try {
        const job = invoice.job_id ? await base44.asServiceRole.entities.Job.get(invoice.job_id) : null;
        const repId = job?.assigned_rep_id;
        await base44.asServiceRole.entities.Notification.create({
          title: `Invoice ${invoice.invoice_number} — Payment Received`,
          body: `$${paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} paid via Stripe for ${invoice.invoice_label || ''} on job ${invoice.job_number || ''}. New balance: $${newBalanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          type: 'info',
          link: `/jobs/${invoice.job_id}`,
          assignee_id: repId || null,
          target_roles: ['owner', 'admin'],
        });
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr.message);
      }

      return Response.json({ received: true, invoice_id: invoiceId, amount_paid: paymentAmount, new_status: newStatus });
    }

    // ── SUBSCRIPTION LIFECYCLE EVENTS ──
    // customer.subscription.updated
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const orgId = sub.metadata?.organization_id;

      if (!orgId) {
        return Response.json({ received: true, event: event.type, note: 'No org metadata' });
      }

      let newStatus = org?.subscription_status;
      if (sub.status === 'active') newStatus = 'active';
      else if (sub.status === 'past_due') newStatus = 'past_due';
      else if (sub.status === 'unpaid') newStatus = 'past_due';
      else if (sub.status === 'canceled') newStatus = 'suspended';
      else if (sub.status === 'incomplete_expired') newStatus = 'suspended';

      const org = await base44.asServiceRole.entities.Organization.get(orgId);
      if (!org) {
        return Response.json({ error: 'Organization not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.Organization.update(orgId, {
        subscription_status: newStatus,
        subscription_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
        last_billing_sync_at: new Date().toISOString(),
      });

      if (newStatus !== org.subscription_status) {
        await base44.asServiceRole.entities.SuperAdminAuditLog.create({
          admin_email: 'system@fabtrack',
          admin_name: 'Stripe Webhook',
          action_type: 'subscription_updated',
          organization_id: orgId,
          action_detail: `Subscription status changed from "${org.subscription_status}" to "${newStatus}" by Stripe`,
        });
      }

      return Response.json({ received: true, type: 'subscription_updated', new_status: newStatus });
    }

    // customer.subscription.deleted
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const orgId = sub.metadata?.organization_id;

      if (orgId) {
        await base44.asServiceRole.entities.Organization.update(orgId, {
          subscription_status: 'suspended',
          stripe_subscription_id: null,
          subscription_period_end: null,
          last_billing_sync_at: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.SuperAdminAuditLog.create({
          admin_email: 'system@fabtrack',
          admin_name: 'Stripe Webhook',
          action_type: 'subscription_deleted',
          organization_id: orgId,
          action_detail: 'Subscription cancelled in Stripe — org suspended',
        });
      }

      return Response.json({ received: true, type: 'subscription_deleted' });
    }

    // invoice.payment_succeeded (subscription renewal)
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const subId = invoice.subscription;

      if (!subId) {
        return Response.json({ received: true, event: event.type });
      }

      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        const orgId = sub.metadata?.organization_id;
        if (orgId) {
          await base44.asServiceRole.entities.Organization.update(orgId, {
            subscription_status: 'active',
            last_billing_sync_at: new Date().toISOString(),
          });
        }
      } catch { /* subscription may not exist anymore */ }

      return Response.json({ received: true, type: 'invoice_paid' });
    }

    // invoice.payment_failed (subscription renewal failed)
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subId = invoice.subscription;

      if (subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          const orgId = sub.metadata?.organization_id;
          if (orgId) {
            await base44.asServiceRole.entities.Organization.update(orgId, {
              subscription_status: 'past_due',
              last_billing_sync_at: new Date().toISOString(),
            });

            await base44.asServiceRole.entities.SuperAdminAuditLog.create({
              admin_email: 'system@fabtrack',
              admin_name: 'Stripe Webhook',
              action_type: 'subscription_updated',
              organization_id: orgId,
              action_detail: 'Subscription payment failed — org set to past_due',
            });
          }
        } catch { /* subscription may not exist */ }
      }

      return Response.json({ received: true, type: 'invoice_payment_failed' });
    }

    // ── UNHANDLED EVENTS ──
    return Response.json({ received: true, event: event.type });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});