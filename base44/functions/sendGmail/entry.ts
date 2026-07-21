import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Sends an email via Gmail using the correct connection based on routing rules.
// Body: {
//   to: string, subject: string, html_body: string, text_body?: string,
//   routing_type: "invoice" | "estimate" | "user_message" | "system",
//   sender_employee_id?: string   // required for routing_type="user_message"
// }

function buildRawEmail({ from, fromName, to, subject, htmlBody, textBody }) {
  const boundary = `boundary_${Date.now()}`;
  const headers = [
    `From: ${fromName ? `${fromName} <${from}>` : from}`,
    `Reply-To: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join('\r\n');

  const parts = [
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    '',
    textBody || subject,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    '',
    htmlBody,
    `--${boundary}--`,
  ].join('\r\n');

  const raw = `${headers}\r\n\r\n${parts}`;
  return btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getValidToken(base44, type, employeeId, orgId) {
  // Tenant isolation: every lookup must be scoped to the caller's organization.
  if (!orgId) return { error: type === 'system' ? 'system_not_connected' : 'user_not_connected' };
  if (type === 'system') {
    const records = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'gmail_system_sender', organization_id: orgId });
    if (!records.length) return { error: 'system_not_connected' };
    const rec = records[0];
    if (rec.system_sender_status !== 'connected') return { error: 'system_not_connected' };

    // Check expiry
    const expiry = rec.system_sender_token_expiry ? new Date(rec.system_sender_token_expiry) : null;
    if (!expiry || expiry <= new Date(Date.now() + 60000)) {
      // Refresh
      const refreshRes = await base44.functions.invoke('gmailRefreshToken', { type: 'system', organization_id: orgId });
      if (refreshRes.data?.error) return { error: 'system_expired' };
      return { token: refreshRes.data.access_token, from: rec.system_sender_email };
    }
    return { token: rec.system_sender_access_token, from: rec.system_sender_email };
  } else {
    // Per-user
    const emps = await base44.asServiceRole.entities.Employee.filter({ id: employeeId });
    if (!emps.length || !emps[0].gmail_connected) return { error: 'user_not_connected' };
    if (emps[0].organization_id !== orgId) return { error: 'user_not_connected' };
    const emp = emps[0];
    if (emp.gmail_token_status !== 'connected') return { error: 'user_expired', employee: emp };

    const expiry = emp.gmail_token_expiry ? new Date(emp.gmail_token_expiry) : null;
    if (!expiry || expiry <= new Date(Date.now() + 60000)) {
      const refreshRes = await base44.functions.invoke('gmailRefreshToken', { type: 'user', employee_id: employeeId });
      if (refreshRes.data?.error) return { error: 'user_expired', employee: emp };
      return { token: refreshRes.data.access_token, from: emp.gmail_connected_email || emp.assigned_comm_email };
    }
    return { token: emp.gmail_access_token, from: emp.gmail_connected_email || emp.assigned_comm_email };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, html_body, text_body, routing_type, sender_employee_id } = await req.json();
    if (!to || !subject || !html_body) {
      return Response.json({ error: 'to, subject, and html_body are required.' }, { status: 400 });
    }

    if (!user.organization_id) {
      return Response.json({ error: 'Your account is not linked to an organization.' }, { status: 403 });
    }
    // Org display name for the From header
    const org = await base44.asServiceRole.entities.Organization.get(user.organization_id).catch(() => null);
    const orgName = org?.name || '';

    let tokenData;
    let usingFallback = false;

    // Routing rules
    if (routing_type === 'invoice' || routing_type === 'estimate' || routing_type === 'system') {
      // Privileged routing types send fully custom content from the org's official
      // billing identity — restrict to roles that legitimately send estimates/invoices.
      const callerRoles = (user.roles || (user.role ? [user.role] : [])).map(r => r.toLowerCase());
      const allowedSystemSenderRoles = ['owner', 'admin', 'estimator', 'accountant', 'shop_manager'];
      if (!callerRoles.some(r => allowedSystemSenderRoles.includes(r))) {
        return Response.json({ error: 'Not authorized to send email from the company billing address.' }, { status: 403 });
      }
      console.log(`[sendGmail] request: to=${to} routing_type=${routing_type} sender=system(org=${user.organization_id})`);
      tokenData = await getValidToken(base44, 'system', null, user.organization_id);
      if (tokenData.error) {
        console.log(`[sendGmail] system sender unavailable: error=${tokenData.error} — no AppSettings record with setting_key="gmail_system_sender" is connected/found`);
        return Response.json({
          error: `Your company email isn't connected yet. Connect it in Settings → Integrations before sending estimates or invoices.`,
          code: 'system_sender_unavailable',
          detail: tokenData.error,
        }, { status: 503 });
      }
      console.log(`[sendGmail] system token resolved OK, sending from=${tokenData.from}`);
    } else if (routing_type === 'user_message') {
      if (sender_employee_id) {
        // Only allow sending as: the caller's own linked employee record, or — for
        // owners/admins — another employee within the caller's own organization.
        const senderEmp = await base44.asServiceRole.entities.Employee.filter({ id: sender_employee_id });
        const targetEmployee = senderEmp[0];
        const callerRoles = (user.roles || (user.role ? [user.role] : [])).map(r => r.toLowerCase());
        const isSelf = targetEmployee && targetEmployee.user_id === user.id;
        const isAdminInSameOrg = targetEmployee && targetEmployee.organization_id === user.organization_id && (callerRoles.includes('owner') || callerRoles.includes('admin'));

        if (!targetEmployee || (!isSelf && !isAdminInSameOrg)) {
          return Response.json({ error: 'Not authorized to send email as this employee.' }, { status: 403 });
        }
        tokenData = await getValidToken(base44, 'user', sender_employee_id, user.organization_id);
      } else {
        tokenData = { error: 'user_not_connected' };
      }
      if (tokenData.error) {
        // Fallback to system sender for user messages
        tokenData = await getValidToken(base44, 'system', null, user.organization_id);
        usingFallback = true;
        if (tokenData.error) {
          return Response.json({
            error: 'Neither user Gmail nor system sender is configured. Cannot send email.',
            code: 'no_sender_available',
          }, { status: 503 });
        }
      }
    } else {
      return Response.json({ error: 'Invalid routing_type.' }, { status: 400 });
    }

    const rawEmail = buildRawEmail({
      from: tokenData.from,
      fromName: orgName,
      to,
      subject,
      htmlBody: html_body,
      textBody: text_body,
    });

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawEmail }),
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      return Response.json({ error: 'Gmail API error', detail: sendData }, { status: 502 });
    }

    return Response.json({
      ok: true,
      message_id: sendData.id,
      from: tokenData.from,
      used_fallback: usingFallback,
      fallback_message: usingFallback
        ? `Sending from ${tokenData.from} — connect your email in Settings to send from your own address.`
        : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});