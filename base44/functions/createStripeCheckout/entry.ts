import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@17.7.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { invoice_id, cancel_url, success_url } = body;

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 });
    }

    // Fetch the invoice
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate balance due
    const balanceDue = invoice.balance_due ?? invoice.total - (invoice.amount_paid || 0);
    const amountInCents = Math.round(Math.max(balanceDue, 0.50) * 100); // minimum $0.50

    if (amountInCents < 50) {
      return Response.json({ error: 'Invoice has no balance due' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice ${invoice.invoice_number || ''}`,
            description: invoice.invoice_label || invoice.invoice_type || 'Invoice',
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number || '',
        job_id: invoice.job_id || '',
      },
      success_url: success_url || `${req.headers.get('origin') || ''}/invoice-view/${invoice.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.get('origin') || ''}/invoice-view/${invoice.id}?payment=cancelled`,
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