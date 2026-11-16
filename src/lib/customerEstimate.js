// The single rule for what a customer sees. Internal costs, margins, labor hours and
// takeoffs never reach this file: it reads only the sell side of a line (total) plus the
// two visibility flags. The customer view and the PDF come through buildCustomerDoc;
// the public share page comes through applyCustomerFold. Same fold, three consumers.
const num = (n) => Number(n) || 0;
const r2 = (n) => Math.round(num(n) * 100) / 100;

const FUEL_NOTE = "· includes fuel & travel";

// Estimate line -> customer line. Nothing internal survives this mapping.
function customerLine(l) {
  return {
    name: l.service_name || "",
    color: l.color || "",
    description: l.description || "",
    location: !l.install_location || l.install_location === "N/A" ? "" : l.install_location,
    qty: l.quantity ?? null,
    unit: l.unit || "",
    amount: r2(l.total),
  };
}

/**
 * show_on_customer_estimate: null/true -> its own line, false -> folded into the first line.
 * fuel_show_as_separate_line: true -> its own "Fuel & travel" line, else folded.
 * No cent disappears: folded amounts ride on the first visible line.
 */
export function foldCustomerLines(lineItems = [], { fuelPrice = 0, fuelSeparate = false } = {}) {
  // A stored synthetic fuel row is never shown; fuel is driven by the two fields above.
  const items = lineItems.filter((l) => !l._is_fuel);
  const shown = items.filter((l) => l.show_on_customer_estimate !== false);
  const foldedLines = items
    .filter((l) => l.show_on_customer_estimate === false)
    .reduce((s, l) => s + r2(l.total), 0);
  const foldedFuel = fuelSeparate ? 0 : r2(fuelPrice);
  const folded = r2(foldedLines + foldedFuel);
  const note = foldedFuel > 0 ? FUEL_NOTE : "";
  const fuelLine = { name: "Fuel & travel", color: "", description: "", location: "", qty: null, unit: "", amount: r2(fuelPrice) };
  const withNote = (line) => ({ ...line, description: [line.description, note].filter(Boolean).join(" ") });

  if (shown.length) {
    const lines = shown.map((l, i) => {
      const line = customerLine(l);
      if (i > 0 || !folded) return line;
      return { ...withNote(line), amount: r2(line.amount + folded) };
    });
    return fuelSeparate ? [...lines, fuelLine] : lines;
  }

  // Nothing itemized: one combined line carries the whole amount.
  const base = items.length ? customerLine(items[0]) : null;
  const combined = base
    ? { ...withNote(base), amount: folded }
    : (r2(fuelPrice) > 0 ? fuelLine : null);
  if (!combined) return [];
  return fuelSeparate && base ? [combined, fuelLine] : [combined];
}

// Subtotal is what the customer can add up on screen; deposit and balance come off it.
function withTotals(doc, estimateTotal) {
  const subtotal = r2(doc.lines.reduce((s, l) => s + l.amount, 0));
  const total = num(estimateTotal) || subtotal;
  const deposit = r2((total * num(doc.deposit_pct)) / 100);
  return { ...doc, subtotal, total, deposit, balance: r2(total - deposit) };
}

export function buildCustomerDoc({ estimate, settings, customer, businessInfo, agreementText }) {
  const items = estimate?.line_items || [];
  const storedFuel = items.filter((l) => l._is_fuel).reduce((s, l) => s + r2(l.total), 0);
  const fuelPrice = estimate?.fuel_price != null ? r2(estimate.fuel_price) : storedFuel;
  const doc = {
    business: { name: businessInfo?.name || "High Country Metal Works", address: businessInfo?.address || "" },
    estimate_number: estimate?.estimate_number || "",
    valid_days: settings?.estimate_valid_days ?? 30,
    status: estimate?.status || "Draft",
    lines: foldCustomerLines(items, { fuelPrice, fuelSeparate: !!estimate?.fuel_show_as_separate_line }),
    deposit_pct: settings?.deposit_pct ?? 50,
    terms: customer?.payment_terms === "Custom" ? `Net ${customer.payment_terms_custom_days || 0}` : customer?.payment_terms || "Net 15",
    agreement_text: agreementText || "",
    signed: estimate?.status === "Approved" && estimate?.approved_at
      ? { printed_name: estimate.customer_printed_name || estimate.customer_signature || "", signature: estimate.customer_signature || "", approved_at: estimate.approved_at }
      : null,
  };
  return withTotals(doc, estimate?.total);
}

// The share page receives allow-listed line rows from getPublicDocument; fold them here so
// the public page, the customer view and the PDF can never disagree.
export function applyCustomerFold(payload) {
  if (!payload) return payload;
  const doc = {
    ...payload,
    deposit_pct: payload.deposit_pct ?? 50,
    lines: foldCustomerLines(payload.lines || [], { fuelPrice: payload.fuel_price || 0, fuelSeparate: !!payload.fuel_show_as_separate_line }),
  };
  return withTotals(doc, payload.total);
}