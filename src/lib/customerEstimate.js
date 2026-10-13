// Allow-list builder for the customer-facing estimate. Only the fields named here
// ever reach the customer view, share page and PDF. The share page gets the same
// shape from the getPublicDocument function.
export function buildCustomerDoc({ estimate, settings, customer, businessInfo, agreementText }) {
  const lines = (estimate?.line_items || []).map((l) => ({
    name: l.service_name || "",
    color: l.color || "",
    description: l._is_fuel ? "" : l.description || "",
    location: l._is_fuel || !l.install_location || l.install_location === "N/A" ? "" : l.install_location,
    qty: l._is_fuel ? 1 : l.quantity,
    unit: l._is_fuel ? "" : l.unit || "",
    amount: l.total || 0,
    is_fuel: !!l._is_fuel,
  }));
  const total = estimate?.total || 0;
  const depositPct = settings?.deposit_pct ?? 50;
  const deposit = Math.round(total * depositPct) / 100;
  const terms = customer?.payment_terms === "Custom" ? `Net ${customer.payment_terms_custom_days || 0}` : customer?.payment_terms || "Net 15";
  return {
    business: { name: businessInfo?.name || "High Country Metal Works", address: businessInfo?.address || "" },
    estimate_number: estimate?.estimate_number || "",
    valid_days: settings?.estimate_valid_days ?? 30,
    status: estimate?.status || "Draft",
    lines,
    subtotal: estimate?.subtotal ?? lines.reduce((s, l) => s + l.amount, 0),
    total,
    deposit_pct: depositPct,
    deposit,
    balance: Math.round((total - deposit) * 100) / 100,
    terms,
    agreement_text: agreementText || "",
    signed: estimate?.status === "Approved" && estimate?.approved_at
      ? { printed_name: estimate.customer_printed_name || estimate.customer_signature || "", signature: estimate.customer_signature || "", approved_at: estimate.approved_at }
      : null,
  };
}