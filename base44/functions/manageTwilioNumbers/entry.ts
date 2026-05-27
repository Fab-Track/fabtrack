import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helper: list phone numbers from Twilio account
async function fetchTwilioNumbers(accountSid, authToken) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`;
  const resp = await fetch(url, {
    headers: { 'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`) }
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.message || 'Failed to fetch Twilio numbers');
  }
  const data = await resp.json();
  return data.incoming_phone_numbers || [];
}

// Helper: validate a specific number exists in Twilio
async function validateTwilioNumber(accountSid, authToken, phoneNumber) {
  const numbers = await fetchTwilioNumbers(accountSid, authToken);
  return numbers.find(n => n.phone_number === phoneNumber || n.friendly_name === phoneNumber);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'owner'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (action === 'listTwilioNumbers') {
      // List numbers from Twilio (for validation / add flow)
      if (!accountSid || !authToken) {
        return Response.json({ ok: true, numbers: [], simulated: true });
      }
      const numbers = await fetchTwilioNumbers(accountSid, authToken);
      return Response.json({
        ok: true,
        numbers: numbers.map(n => ({
          phone_number: n.phone_number,
          friendly_name: n.friendly_name,
        }))
      });
    }

    if (action === 'validateAndAdd') {
      // Validate a number exists in Twilio, then add to our entity
      const { phone_number, is_main } = body;
      if (!phone_number) return Response.json({ error: 'phone_number required' }, { status: 400 });

      if (accountSid && authToken) {
        const found = await validateTwilioNumber(accountSid, authToken, phone_number);
        if (!found) {
          return Response.json({ ok: false, error: 'Number not found in your Twilio account. Make sure it is in E.164 format (e.g. +18015550142).' });
        }
      }

      // Check if already added
      const existing = await base44.asServiceRole.entities.TwilioPhoneNumber.filter({ phone_number });
      if (existing.length > 0) {
        return Response.json({ ok: false, error: 'This number is already added.' });
      }

      const created = await base44.asServiceRole.entities.TwilioPhoneNumber.create({
        phone_number,
        friendly_name: is_main ? 'Main Business Number' : null,
        is_main: !!is_main,
        is_active: true,
      });

      return Response.json({ ok: true, record: created });
    }

    if (action === 'assignNumber') {
      const { number_id, employee_id, employee_name } = body;
      if (!number_id) return Response.json({ error: 'number_id required' }, { status: 400 });

      const updated = await base44.asServiceRole.entities.TwilioPhoneNumber.update(number_id, {
        assigned_employee_id: employee_id || null,
        assigned_employee_name: employee_name || null,
      });

      // Also update employee record if assigning
      if (employee_id) {
        // Find the number to get phone string
        const numbers = await base44.asServiceRole.entities.TwilioPhoneNumber.filter({ id: number_id });
        const num = numbers[0];
        if (num) {
          await base44.asServiceRole.entities.Employee.update(employee_id, {
            assigned_sms_number: num.phone_number,
          });
        }
      }

      // If unassigning, clear from employee too
      if (!employee_id) {
        const numbers = await base44.asServiceRole.entities.TwilioPhoneNumber.filter({ id: number_id });
        const num = numbers[0];
        if (num?.assigned_employee_id) {
          await base44.asServiceRole.entities.Employee.update(num.assigned_employee_id, {
            assigned_sms_number: null,
          });
        }
      }

      return Response.json({ ok: true, record: updated });
    }

    if (action === 'removeNumber') {
      const { number_id } = body;
      if (!number_id) return Response.json({ error: 'number_id required' }, { status: 400 });

      // Clear employee assignment if any
      const numbers = await base44.asServiceRole.entities.TwilioPhoneNumber.filter({ id: number_id });
      const num = numbers[0];
      if (num?.assigned_employee_id) {
        await base44.asServiceRole.entities.Employee.update(num.assigned_employee_id, {
          assigned_sms_number: null,
        });
      }

      await base44.asServiceRole.entities.TwilioPhoneNumber.delete(number_id);
      return Response.json({ ok: true });
    }

    if (action === 'sendTestSMS') {
      const { to_phone, from_phone, from_name } = body;
      if (!accountSid || !authToken) {
        return Response.json({ ok: true, simulated: true });
      }
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formData = new URLSearchParams({
        To: to_phone,
        From: from_phone,
        Body: `✅ Test SMS from FabTrack — This is ${from_name}'s assigned number. Twilio is working!`,
      });
      const resp = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      const data = await resp.json();
      if (resp.ok) return Response.json({ ok: true, sid: data.sid });
      return Response.json({ ok: false, error: data.message || 'Twilio error' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});