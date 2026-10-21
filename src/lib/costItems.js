// Shared helpers for Catalog › Cost Items (MaterialPriceList).

export const COST_TYPES = ["Materials", "Labor", "Subcontractor", "Equipment", "Other"];
export const USED_AS_OPTIONS = ["Top Rail", "Bottom Rail", "Post", "Picket", "Other"];
export const RAILING_SLOTS = ["Top Rail", "Bottom Rail", "Post", "Picket"];
export const DEFAULT_SHAPES = ["Square Tube", "Rectangle Tube", "Flat Bar", "HR Channel", "Angle", "Round Bar", "Stair", "Sheet", "Other"];
export const METHOD_LABELS = { linear_foot: "Linear foot", weight: "Weight", unit: "Unit" };

const round4 = (n) => Math.round(n * 10000) / 10000;

// cost_per_foot is always calculated by the chosen method.
// `typedCostPerFoot` is only used for linear_foot when there is no stick price.
export function calcCostPerFoot({ method, stock, stick, typedCostPerFoot, weightPerFt, pricePerLb }) {
  if (method === "linear_foot") {
    if (stick > 0 && stock > 0) return round4(stick / stock);
    return typedCostPerFoot > 0 ? typedCostPerFoot : 0;
  }
  if (method === "weight") return round4((weightPerFt || 0) * (pricePerLb || 0));
  return 0; // unit: cost_per_unit is the cost
}

export function itemStatus(m) {
  if (m.needs_review) return "Needs review";
  const method = m.cost_method || "linear_foot";
  if ((m.category === "Sheet" || m.category === "Stair") && method === "linear_foot") return "Check unit";
  return "OK";
}

export function fmtMoney(n, digits = 2) {
  return `$${Number(n || 0).toFixed(digits)}`;
}

export function stickLabel(m) {
  return m.stock_length_ft > 0 && m.cost_per_stick > 0 ? `${m.stock_length_ft} ft · ${fmtMoney(m.cost_per_stick)}` : "—";
}

export function costColumn(m) {
  if (m.cost_method === "unit") return m.cost_per_unit > 0 ? `${fmtMoney(m.cost_per_unit)} / ${m.unit || "unit"}` : "—";
  return m.cost_per_foot > 0 ? fmtMoney(m.cost_per_foot, 4) : "—";
}