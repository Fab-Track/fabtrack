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
    let businessInfo = null;
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
      try {
        const org = await base44.asServiceRole.entities.Organization.get(doc.organization_id);
        businessInfo = {
          name: org?.name || null,
          logo_url: org?.logo_url || null,
          address: org?.address || null,
          phone: org?.phone || null,
          email: org?.email || null,
          website: org?.website || null,
        };
      } catch {
        businessInfo = null;
      }
    }

    // Internal costing must never reach customers
    const publicLines = (doc.line_items || []).map((l: any) => {
      const { hard_cost, cost_breakdown, install_hours, margin_pct, _hard_cost_per_unit, _cost_components, _markup_multiplier, _railing_takeoff, mgr_approval, ...rest } = l;
      return { ...rest, components: (l.components || []).map((c: any) => ({ component_type: c.component_type, name: c.name })) };
    });

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
      // Allow-list: only these fields are ever sent to the customer.
      let mainSettings: any = {};
      try {
        const m = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'main', organization_id: doc.organization_id });
        mainSettings = m[0] || {};
      } catch { mainSettings = {}; }
      const lines = (doc.line_items || []).map((l: any) => ({
        name: l.service_name || '',
        color: l.color || '',
        description: l._is_fuel ? '' : (l.description || ''),
        location: l._is_fuel || !l.install_location || l.install_location === 'N/A' ? '' : l.install_location,
        qty: l._is_fuel ? 1 : l.quantity,
        unit: l._is_fuel ? '' : (l.unit || ''),
        amount: l.total || 0,
        is_fuel: !!l._is_fuel,
      }));
      const total = doc.total || 0;
      const depositPct = mainSettings.deposit_pct ?? 50;
      const deposit = Math.round(total * depositPct) / 100;
      documentPayload = {
        share_token: doc.share_token || null,
        business: { name: businessInfo?.name || 'High Country Metal Works', address: businessInfo?.address || '' },
        estimate_number: doc.estimate_number || '',
        valid_days: mainSettings.estimate_valid_days ?? 30,
        status: doc.status || 'Draft',
        lines,
        subtotal: doc.subtotal ?? lines.reduce((s: number, l: any) => s + l.amount, 0),
        total,
        deposit_pct: depositPct,
        deposit,
        balance: Math.round((total - deposit) * 100) / 100,
        terms: customer?.payment_terms === 'Custom' ? `Net ${customer.payment_terms_custom_days || 0}` : (customer?.payment_terms || 'Net 15'),
        // After signing, show the exact text that was signed
        agreement_text: doc.status === 'Approved' && doc.agreement_text_snapshot != null ? doc.agreement_text_snapshot : (contractText || ''),
        signed: doc.status === 'Approved' && doc.approved_at
          ? { printed_name: doc.customer_printed_name || doc.customer_signature || '', signature: doc.customer_signature || '', approved_at: doc.approved_at }
          : null,
      };
    } else {
      documentPayload = {
        id: doc.id,
        share_token: doc.share_token || null,
        invoice_number: doc.invoice_number || null,
        invoice_label: doc.invoice_label || null,
        status: doc.status || 'Unpaid',
        line_items: publicLines,
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
      business_info: businessInfo,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});