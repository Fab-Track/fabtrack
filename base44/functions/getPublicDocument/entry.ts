import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { type, token } = body;

    if (!token || (type !== 'estimate' && type !== 'invoice')) {
      return Response.json({ error: 'A valid type ("estimate" or "invoice") and token are required' }, { status: 400 });
    }

    const entityName = type === 'estimate' ? 'Estimate' : 'Invoice';
    let doc = null;
    try {
      const matches = await base44.asServiceRole.entities[entityName].filter({ share_token: token });
      doc = matches[0] || null;
    } catch {
      doc = null;
    }
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    let job = null;
    if (doc.job_id) {
      try {
        job = await base44.asServiceRole.entities.Job.get(doc.job_id);
      } catch {
        job = null;
      }
    }

    let customer = null;
    if (job?.customer_id) {
      try {
        customer = await base44.asServiceRole.entities.Customer.get(job.customer_id);
      } catch {
        customer = null;
      }
    }

    let contractText = null;
    if (doc.organization_id) {
      try {
        const settings = await base44.asServiceRole.entities.AppSettings.filter({
          setting_key: 'estimate_settings',
          organization_id: doc.organization_id,
        });
        contractText = settings[0]?.estimate_contract_text || null;
      } catch {
        contractText = null;
      }
    }

    const jobSubset = job ? {
      job_number: job.job_number || null,
      job_name: job.job_name || null,
      site_address: job.site_address || null,
    } : null;

    const customerSubset = customer ? {
      name: customer.name || null,
      email: customer.email || null,
      phone: customer.phone || null,
    } : null;

    let documentPayload;
    if (type === 'estimate') {
      documentPayload = {
        id: doc.id,
        share_token: doc.share_token || null,
        estimate_number: doc.estimate_number || null,
        estimate_date: doc.estimate_date || null,
        expiration_date: doc.expiration_date || null,
        status: doc.status || 'Draft',
        line_items: doc.line_items || [],
        view_mode: doc.view_mode || 'summary',
        discount_percent: doc.discount_percent || 0,
        markup_percent: doc.markup_percent || 0,
        overhead_percent: doc.overhead_percent || 0,
        tax_percent: doc.tax_percent || 0,
        total: doc.total || 0,
        notes: doc.notes || '',
        customer_signature: doc.customer_signature || null,
        customer_printed_name: doc.customer_printed_name || null,
        approved_date: doc.approved_date || null,
        approved_at: doc.approved_at || null,
        approval_method: doc.approval_method || null,
      };
    } else {
      documentPayload = {
        id: doc.id,
        share_token: doc.share_token || null,
        invoice_number: doc.invoice_number || null,
        invoice_label: doc.invoice_label || null,
        status: doc.status || 'Unpaid',
        line_items: doc.line_items || [],
        view_mode: doc.view_mode || 'detail',
        subtotal: doc.subtotal || 0,
        discount_percent: doc.discount_percent || 0,
        tax_percent: doc.tax_percent || 0,
        tax_amount: doc.tax_amount || 0,
        total: doc.total || 0,
        amount_paid: doc.amount_paid || 0,
        balance_due: doc.balance_due ?? ((doc.total || 0) - (doc.amount_paid || 0)),
        notes: doc.notes || '',
        issued_date: doc.issued_date || null,
        due_date: doc.due_date || null,
      };
    }

    return Response.json({
      type,
      document: documentPayload,
      job: jobSubset,
      customer: customerSubset,
      contract_text: contractText,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});