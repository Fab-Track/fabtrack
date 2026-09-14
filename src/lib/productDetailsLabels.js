/**
 * Human-readable labels for product_details entry keys.
 * Keys not listed here fall back to a title-cased version of the key.
 * `id` and `mgr_approval` are structural and excluded from display.
 */
export const PRODUCT_FIELD_LABELS = {
  product: "Product",
  railing_style: "Railing Style",
  railing_style_notes: "Custom Railing Style Notes",
  custom_top_rail: "Top Rail",
  custom_top_rail_notes: "Top Rail (other)",
  custom_top_rail_link: "Top Rail Link",
  custom_bottom_rail: "Bottom Rail",
  custom_bottom_rail_notes: "Bottom Rail (other)",
  custom_post: "Post",
  custom_post_notes: "Post (other)",
  custom_pickets: "Pickets",
  custom_pickets_notes: "Pickets (other)",
  custom_pickets_link: "Pickets Link",
  custom_base_plate: "Base Plate Size",
  custom_picket_direction: "Picket Direction",
  custom_picket_direction_notes: "Picket Direction (other)",
  stair_style: "Stair Style",
  stair_style_notes: "Other Stair Style Notes",
  stair_material: "Stair Material",
  stair_material_notes: "Other Stair Material Notes",
  stair_tread_material: "Stair Tread Material",
  stair_tread_material_notes: "Other Stair Tread Material Notes",
  powdercoat: "Powdercoat",
  powdercoat_color: "Powdercoat Color",
  powdercoat_color_notes: "Other Powdercoat Color Notes",
  other_notes: "Other Product Notes",
};

/** Keys that are structural / non-display, never shown as scope fields. */
export const HIDDEN_PRODUCT_KEYS = new Set(["id", "mgr_approval"]);

/**
 * Returns an ordered array of { key, label, value } for every non-empty,
 * non-hidden field on a product entry.
 */
export function getProductScopeFields(entry = {}) {
  return Object.entries(entry)
    .filter(([key, val]) => !HIDDEN_PRODUCT_KEYS.has(key) && val !== "" && val != null)
    .map(([key, val]) => ({
      key,
      label: PRODUCT_FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Array.isArray(val) ? val.join(", ") : String(val),
    }));
}