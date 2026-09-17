import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  getQboContext, qboRequest, resolveQboCustomer,
  nextQboInvoiceNumber, fetchQboInvoice, derivePaymentState,
} from '../../shared/qbo.js';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  let invoiceId = null;

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    invoiceId = body?.invoice_id;
    if (!invoiceId) return Response.json({ error: 'invoice_id is required' }, { status: 400 });

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const ctx = await getQboContext(base44);

    // ── Resolve the QBO customer (match by name, create if missing) ──
    let customer = null;
    if (invoice.customer_id) {
      customer = await base44.asServiceRole.entities.Customer.get(invoice.customer_id).catch(() => null);
    }
    const customerName = customer?.name || invoice.customer_name;
    let qboCustomerId = customer?.qbo_customer_id;
    if (!qboCustomerId) {
      const resolved = await resolveQboCustomer(ctx, {
        name: customerName,
        email: customer?.email,
        phone: customer?.phone,
      });
      qboCustomerId = resolved.id;
      if (customer?.id && qboCustomerId) {
        await base44.asServiceRole.entities.Customer.update(customer.id, { qbo_customer_id: qboCustomerId });
      }
    }

    // ── Map each line item to a QBO Item via the Service Catalog mapping ──
    const catalog = await base44.asServiceRole.entities.ServiceCatalog.filter({
      organization_id: invoice.organization_id,
    });
    const catalogByName = new Map(catalog.map((c) => [(c.name || '').toLowerCase(), c]));

    const unmapped = [];
    const lines = [];
    for (const line of invoice.line_items || []) {
      const match = catalogByName.get((line.service_name || '').toLowerCase());
      if (!match?.qbo_item_id) {
        unmapped.push(line.service_name || '(no service item)');
        continue;
      }
      const qty = Number(line.quantity || 0);
      const rate = Number(line.unit_cost || 0);
      lines.push({
        DetailType: 'SalesItemLineDetail',
        Amount: Number((qty * rate).toFixed(2)),
        Description: line.description || line.service_name || '',
        SalesItemLineDetail: {
          ItemRef: { value: String(match.qbo_item_id) },
          Qty: qty,
          UnitPrice: rate,
        },
      });
    }

    if (unmapped.length) {
      const msg = `These service items are not mapped to a QuickBooks product/service yet: ${[...new Set(unmapped)].join(', ')}`;
      await base44.asServiceRole.entities.Invoice.update(invoiceId, {
        qbo_sync_status: 'error',
        qbo_sync_error: msg,
      });
      return Response.json({ error: msg }, { status: 400 });
    }
    if (!lines.length) {
      return Response.json({ error: 'This invoice has no line items to send to QuickBooks.' }, { status: 400 });
    }

    // ── Build the QBO invoice body ──
    const qboBody = {
      CustomerRef: { value: String(qboCustomerId) },
      Line: lines,
    };
    if (invoice.issued_date) qboBody.TxnDate = invoice.issued_date;
    if (invoice.due_date) qboBody.DueDate = invoice.due_date;

    let saved;
    if (invoice.qbo_invoice_id) {
      // Update: re-fetch for the current SyncToken and send a full body.
      const existing = await fetchQboInvoice(ctx, invoice.qbo_invoice_id);
      if (!existing) return Response.json({ error: 'That invoice no longer exists in QuickBooks.' }, { status: 404 });
      qboBody.Id = existing.Id;
      qboBody.SyncToken = existing.SyncToken;
      qboBody.DocNumber = existing.DocNumber;
      const res = await qboRequest(ctx, '/invoice', { method: 'POST', body: qboBody });
      saved = res?.Invoice;
    } else {
      const docNumber = await nextQboInvoiceNumber(ctx);
      if (docNumber) qboBody.DocNumber = docNumber;
      const res = await qboRequest(ctx, '/invoice', { method: 'POST', body: qboBody });
      saved = res?.Invoice;
    }

    if (!saved?.Id) throw new Error('QuickBooks did not return a saved invoice.');

    const state = derivePaymentState(saved);
    await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      qbo_invoice_id: saved.Id,
      qbo_sync_token: saved.SyncToken,
      qbo_doc_number: saved.DocNumber || null,
      qbo_synced_at: new Date().toISOString(),
      qbo_sync_status: 'synced',
      qbo_sync_error: null,
      qbo_payment_status: state.status,
      qbo_balance: state.balance,
    });

    // QBO returns an InvoiceLink (QuickBooks Payments URL) when Payments is enabled on the account.
    const qboPayUrl = saved.InvoiceLink || null;

    return Response.json({
      ok: true,
      qbo_invoice_id: saved.Id,
      qbo_doc_number: saved.DocNumber || null,
      qbo_payment_status: state.status,
      qbo_pay_url: qboPayUrl,
    });
  } catch (error) {
    if (invoiceId) {
      await base44.asServiceRole.entities.Invoice.update(invoiceId, {
        qbo_sync_status: 'error',
        qbo_sync_error: error.message,
      }).catch(() => {});
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}