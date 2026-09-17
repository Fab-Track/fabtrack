import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getQboContext, qboQuery, fetchQboInvoice, derivePaymentState } from '../../shared/qbo.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await getQboContext(base44);

    // ── Cursor: last time we polled QuickBooks ──
    const settingsRows = await base44.asServiceRole.entities.AppSettings.filter({ setting_key: 'qbo_sync' });
    let settings = settingsRows[0] || null;
    const since = settings?.qbo_last_poll_at
      || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const pollStartedAt = new Date().toISOString();

    // ── Payments created/updated since the cursor ──
    const { Payment: payments = [] } = await qboQuery(
      ctx,
      `select * from Payment where MetaData.LastUpdatedTime > '${since}' maxresults 500`
    );

    const touchedInvoiceIds = new Set();
    for (const payment of payments) {
      for (const line of payment.Line || []) {
        for (const txn of line.LinkedTxn || []) {
          if (txn.TxnType === 'Invoice' && txn.TxnId) touchedInvoiceIds.add(String(txn.TxnId));
        }
      }
    }

    let updated = 0;
    for (const qboInvoiceId of touchedInvoiceIds) {
      const matches = await base44.asServiceRole.entities.Invoice.filter({ qbo_invoice_id: qboInvoiceId });
      if (!matches.length) continue;

      const qboInvoice = await fetchQboInvoice(ctx, qboInvoiceId);
      if (!qboInvoice) continue;
      const state = derivePaymentState(qboInvoice);

      for (const inv of matches) {
        const patch = {
          amount_paid: Number(state.paid.toFixed(2)),
          balance_due: Number(state.balance.toFixed(2)),
          status: state.status,
          qbo_payment_status: state.status,
          qbo_balance: Number(state.balance.toFixed(2)),
          qbo_sync_token: qboInvoice.SyncToken,
        };
        if (state.status === 'Paid' && !inv.paid_date) {
          patch.paid_date = new Date().toISOString().split('T')[0];
        }
        if ((state.status === 'Paid' || state.status === 'Partial') && !inv.payment_method) {
          patch.payment_method = 'QuickBooks Online (QBO)';
        }
        await base44.asServiceRole.entities.Invoice.update(inv.id, patch);
        updated++;
      }
    }

    // ── Advance the cursor ──
    if (settings) {
      await base44.asServiceRole.entities.AppSettings.update(settings.id, { qbo_last_poll_at: pollStartedAt });
    } else {
      const orgs = await base44.asServiceRole.entities.Organization.list('-created_date', 1);
      if (orgs[0]) {
        await base44.asServiceRole.entities.AppSettings.create({
          setting_key: 'qbo_sync',
          organization_id: orgs[0].id,
          qbo_last_poll_at: pollStartedAt,
        });
      }
    }

    return Response.json({
      ok: true,
      payments_seen: payments.length,
      invoices_updated: updated,
      polled_since: since,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}