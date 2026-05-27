import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Twilio sends POST with form-encoded body
    const formText = await req.text();
    const params = new URLSearchParams(formText);

    const from = params.get('From') || '';
    const to = params.get('To') || '';
    const body = params.get('Body') || '';
    const sid = params.get('MessageSid') || '';

    if (!from || !body) {
      return new Response('Missing From or Body', { status: 400 });
    }

    // Normalize phone: strip non-digits for matching, but keep original
    const normalizePhone = (p) => p.replace(/\D/g, '');
    const fromNorm = normalizePhone(from);

    // Use service role — this is a webhook, no user session
    const base44 = createClientFromRequest(req);

    // Try to find matching customer by phone
    const customers = await base44.asServiceRole.entities.Customer.list('-created_date', 500);
    const matchedCustomer = customers.find(c => c.phone && normalizePhone(c.phone) === fromNorm);

    // Build the inbound CommMessage record
    const record = {
      channel: 'SMS',
      direction: 'inbound',
      status: 'delivered',
      body,
      from_phone: from,
      to_phone: to,
      from_name: matchedCustomer?.name || from,
      to_name: 'High Country Metal Works',
      twilio_sid: sid,
      sent_at: new Date().toISOString(),
    };

    if (matchedCustomer) {
      record.customer_id = matchedCustomer.id;
      record.customer_name = matchedCustomer.name;
    }

    await base44.asServiceRole.entities.CommMessage.create(record);

    // Return empty TwiML response so Twilio doesn't complain
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('twilioInbound error:', error.message);
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});