import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

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

    // Only handle checkout.session.completed
    if (event.type !== 'checkout.session.completed') {
      return Response.json({ received: true, event: event.type });
    }

    const session = event.data.object;
    const invoiceId = session.metadata?.invoice_id;

    if (!invoiceId) {
      return Response.json({ error: 'No invoice_id in session metadata' }, { status: 400 });
    }

    // Use service role to update invoice (webhook has no user context)
    const base44 = createClient({
      appId: Deno.env.get('BASE44_APP_ID'),
      env: 'production',
    });

    // Fetch current invoice
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const paymentAmount = session.amount_total / 100; // convert cents to dollars
    const newAmountPaid = (invoice.amount_paid || 0) + paymentAmount;
    const newBalanceDue = Math.max(0, invoice.total - newAmountPaid);

    // Determine new status
    let newStatus = 'Paid';
    if (newBalanceDue > 0.01) {
      newStatus = 'Partial';
    }

    const now = new Date().toISOString();

    // Update the invoice
    await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      status: newStatus,
      payment_method: 'Stripe',
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      paid_date: now.split('T')[0],
    });

    // Create a notification for the assigned rep/owner
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
      // Non-critical — log but don't fail the webhook
      console.error('Failed to create notification:', notifErr.message);
    }

    return Response.json({
      received: true,
      invoice_id: invoiceId,
      amount_paid: paymentAmount,
      new_status: newStatus,
    });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});