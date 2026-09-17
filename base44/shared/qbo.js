// Shared QuickBooks Online helpers used by all qbo* backend functions.
const QBO_BASE = "https://quickbooks.api.intuit.com";

export async function getQboContext(base44) {
  const { accessToken, connectionConfig } = await base44.asServiceRole.connectors.getConnection("quickbooks");
  const realmId = connectionConfig?.realmId;
  if (!realmId) throw new Error("QuickBooks is not connected (no company id on the connection).");
  return { accessToken, realmId };
}

export async function qboRequest(ctx, path, { method = "GET", body = null } = {}) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${QBO_BASE}/v3/company/${ctx.realmId}${path}${sep}minorversion=75`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      continue;
    }

    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_e) { json = null; }

    if (!res.ok) {
      const fault = json?.Fault?.Error?.[0];
      const msg = fault
        ? `${fault.Message}${fault.Detail ? ": " + fault.Detail : ""}`
        : `QuickBooks returned ${res.status}`;
      throw new Error(msg);
    }
    return json;
  }
  throw new Error("QuickBooks is busy or rate limiting requests — please try again shortly.");
}

export async function qboQuery(ctx, sql) {
  const data = await qboRequest(ctx, `/query?query=${encodeURIComponent(sql)}`);
  return data?.QueryResponse || {};
}

function escapeSql(value) {
  return String(value || "").replace(/'/g, "\\'");
}

// Match a QBO Customer by exact (case-insensitive) display name; create it if missing.
export async function resolveQboCustomer(ctx, { name, email, phone }) {
  const clean = (name || "").trim();
  if (!clean) throw new Error("Customer name is required to sync to QuickBooks.");

  const { Customer: found = [] } = await qboQuery(
    ctx,
    `select Id, DisplayName, SyncToken from Customer where DisplayName = '${escapeSql(clean)}'`
  );
  const exact = found.find((c) => (c.DisplayName || "").toLowerCase() === clean.toLowerCase());
  if (exact) return { id: exact.Id, syncToken: exact.SyncToken, created: false };

  const body = { DisplayName: clean };
  if (email) body.PrimaryEmailAddr = { Address: email };
  if (phone) body.PrimaryPhone = { FreeFormNumber: phone };

  const created = await qboRequest(ctx, "/customer", { method: "POST", body });
  return { id: created?.Customer?.Id, syncToken: created?.Customer?.SyncToken, created: true };
}

// Query QBO live for the highest existing invoice number and return the next one,
// preserving whatever format is already in use (e.g. INV-0042 -> INV-0043).
export async function nextQboInvoiceNumber(ctx) {
  const { Invoice: invoices = [] } = await qboQuery(
    ctx,
    "select DocNumber from Invoice orderby Id desc maxresults 500"
  );

  let best = null;
  for (const inv of invoices) {
    const doc = (inv.DocNumber || "").trim();
    const m = doc.match(/^(.*?)(\d+)$/);
    if (!m) continue;
    const num = parseInt(m[2], 10);
    if (isNaN(num)) continue;
    if (!best || num > best.num) best = { prefix: m[1], num, pad: m[2].length };
  }

  if (!best) return null; // let QuickBooks auto-number the first invoice
  return `${best.prefix}${String(best.num + 1).padStart(best.pad, "0")}`;
}

export async function fetchQboInvoice(ctx, qboInvoiceId) {
  const data = await qboRequest(ctx, `/invoice/${qboInvoiceId}`);
  return data?.Invoice || null;
}

// Derive FabTrack invoice payment fields from a QBO Invoice object.
export function derivePaymentState(qboInvoice) {
  const total = Number(qboInvoice?.TotalAmt || 0);
  const balance = Number(qboInvoice?.Balance || 0);
  const paid = Math.max(0, total - balance);
  let status = "Unpaid";
  if (balance <= 0.005 && total > 0) status = "Paid";
  else if (paid > 0.005) status = "Partial";
  return { total, balance, paid, status };
}