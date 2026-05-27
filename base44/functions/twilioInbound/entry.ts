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

    // Normalize phone: strip non-digits for matching
    const normalizePhone = (p) => p.replace(/\D/g, '');
    const fromNorm = normalizePhone(from);
    const toNorm = normalizePhone(to);

    // Use service role — this is a webhook, no user session
    const base44 = createClientFromRequest(req);

    // Try to find matching customer by phone
    const customers = await base44.asServiceRole.entities.Customer.list('-created_date', 500);
    const matchedCustomer = customers.find(c => c.phone && normalizePhone(c.phone) === fromNorm);

    // Look up the TwilioPhoneNumber record for the "To" number
    // This tells us which employee this reply is routed to
    const allPhoneNumbers = await base44.asServiceRole.entities.TwilioPhoneNumber.list('-created_date', 50);
    const matchedPhoneNumber = allPhoneNumbers.find(n => normalizePhone(n.phone_number) === toNorm);

    // Determine assigned user context
    let assignedEmployeeId = null;
    let assignedEmployeeName = null;

    if (matchedPhoneNumber?.assigned_employee_id) {
      assignedEmployeeId = matchedPhoneNumber.assigned_employee_id;
      assignedEmployeeName = matchedPhoneNumber.assigned_employee_name;
    }

    // Find the most recent outbound SMS to this customer from this number
    // to link the inbound to the correct job
    let jobId = null;
    let jobNumber = null;
    let jobName = null;

    if (matchedCustomer) {
      const recentOutbound = await base44.asServiceRole.entities.CommMessage.filter({
        customer_id: matchedCustomer.id,
        channel: 'SMS',
        direction: 'outbound',
      });

      // Sort by sent_at descending and find the most recent sent from this "to" number
      const sortedOutbound = recentOutbound
        .filter(m => m.from_phone && normalizePhone(m.from_phone) === toNorm)
        .sort((a, b) => ((b.sent_at || b.created_date) || '').localeCompare((a.sent_at || a.created_date) || ''));

      const lastOutbound = sortedOutbound[0];
      if (lastOutbound?.job_id) {
        jobId = lastOutbound.job_id;
        jobNumber = lastOutbound.job_number;
        jobName = lastOutbound.job_name;
      }
    }

    // Build the inbound CommMessage record
    const record = {
      channel: 'SMS',
      direction: 'inbound',
      status: 'delivered',
      body,
      from_phone: from,
      to_phone: to,
      from_name: matchedCustomer?.name || from,
      to_name: assignedEmployeeName || 'High Country Metal Works',
      twilio_sid: sid,
      sent_at: new Date().toISOString(),
      // Route to assigned employee
      assigned_to_employee_id: assignedEmployeeId,
      assigned_to_employee_name: assignedEmployeeName,
    };

    if (matchedCustomer) {
      record.customer_id = matchedCustomer.id;
      record.customer_name = matchedCustomer.name;
    }

    if (jobId) {
      record.job_id = jobId;
      record.job_number = jobNumber;
      record.job_name = jobName;
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