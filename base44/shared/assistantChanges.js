// Shared rules for assistant proposals: which Job fields may be written, and how
// display text from the assistant is coerced into real values.

// field key -> value kind. Anything not listed here can never be written by the assistant.
export const JOB_FIELDS = {
  job_name: "text",
  job_type: "text",
  stage: "text",
  pipeline_board: "text",
  site_address: "text",
  location_id: "text",
  site_contact_id: "text",
  approver_contact_id: "text",
  bill_to_contact_id: "text",
  design_details: "text",
  powder_coat_color: "text",
  powder_coat_code: "text",
  special_considerations: "text",
  internal_notes: "text",
  assigned_estimator: "text",
  assigned_estimator_name: "text",
  assigned_rep_id: "text",
  assigned_rep_name: "text",
  follow_up_status: "text",
  next_action: "text",
  lead_source: "text",
  lead_customer_type: "text",
  lead_intent: "text",
  size_band: "text",
  customer_approval_status: "text",
  manual_payment_status: "text",
  lead_outcome: "text",
  lead_outcome_category: "text",
  lead_close_reason: "text",
  close_notes: "text",
  expected_install_date: "date",
  promised_install_date: "date",
  next_action_date: "date",
  bid_due_date: "date",
  estimate_deadline: "date",
  next_meeting_date: "date",
  follow_up_date: "date",
  invoice_sent_date: "date",
  estimate_total: "number",
  estimated_labor_hours: "number",
  est_shop_labor_hours: "number",
  est_install_labor_hours: "number",
  est_materials_cost: "number",
  est_powder_coat_cost: "number",
  est_draw_measure_hours: "number",
  est_fuel_cost: "number",
  site_lat: "number",
  site_lng: "number",
  tools_needed: "list",
  assigned_crew_names: "list",
  lead_blockers: "list",
};

export function labelFor(field) {
  return field
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Coerce one proposed display value to the field's real type. Returns { ok, value, error }. */
export function coerce(field, raw) {
  const kind = JOB_FIELDS[field];
  const text = raw == null ? "" : String(raw).trim();
  if (kind === "number") {
    const n = Number(text.replace(/[$,]/g, ""));
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: `${field} must be a number` };
  }
  if (kind === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: false, error: `${field} must be YYYY-MM-DD` };
    return { ok: true, value: text };
  }
  if (kind === "list") {
    const list = text ? text.split(",").map((s) => s.trim()).filter(Boolean) : [];
    return { ok: true, value: list };
  }
  return { ok: true, value: text };
}

/**
 * Turn proposed changes into a Job patch.
 * Returns { patch, clean, unknown } — `clean` is what the review card shows,
 * `unknown` lists rejected field keys.
 */
export function buildPatch(changes) {
  const patch = {};
  const clean = [];
  const unknown = [];
  for (const change of Array.isArray(changes) ? changes : []) {
    const field = String(change?.field || "").trim();
    if (!JOB_FIELDS[field]) {
      if (field) unknown.push(field);
      continue;
    }
    const result = coerce(field, change.new_value);
    if (!result.ok) {
      unknown.push(`${field} (${result.error})`);
      continue;
    }
    patch[field] = result.value;
    clean.push({
      field,
      label: String(change.label || labelFor(field)),
      old_value: change.old_value == null ? "" : String(change.old_value),
      new_value: String(change.new_value ?? ""),
    });
  }
  return { patch, clean, unknown };
}