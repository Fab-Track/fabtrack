import { base44 } from "@/api/base44Client";
import { calcCostPerFoot } from "@/lib/costItems";

const HEADERS = ["name", "shape", "cost_type", "used_as", "cost_codes", "cost_method", "stock_length_ft", "cost_per_stick", "cost_per_foot", "weight_per_ft", "price_per_lb", "unit", "cost_per_unit", "supplier", "sku", "unit_price", "taxable"];

// Columns that drive the calculated cost_per_foot; touching one re-derives it.
const COST_INPUTS = ["cost_method", "stock_length_ft", "cost_per_stick", "cost_per_foot", "weight_per_ft", "price_per_lb_override", "cost_per_unit"];
const NUMERIC = { stock_length_ft: "stock_length_ft", cost_per_stick: "cost_per_stick", cost_per_foot: "cost_per_foot", weight_per_ft: "weight_per_ft", price_per_lb: "price_per_lb_override", unit_price: "unit_price", cost_per_unit: "cost_per_unit" };

const esc = (v) => {
  const t = v == null ? "" : String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

function parseCsv(text) {
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

// Downloads every cost item for the org as CSV (pages through with a cursor).
export async function exportCostItems(orgId, costCodes) {
  const nameOf = (id) => costCodes.find((c) => c.id === id)?.name || "";
  const lines = [HEADERS.join(",")];
  let cursor;
  do {
    const page = await base44.entities.MaterialPriceList.filter({ organization_id: orgId }, { sort: "name", limit: 500, cursor });
    page.items.forEach((m) => {
      lines.push([
        m.name, m.category, m.cost_type, (m.component_type || []).join(";"),
        (m.cost_code_ids || []).map(nameOf).filter(Boolean).join(";"), m.cost_method || "linear_foot",
        m.stock_length_ft, m.cost_per_stick, m.cost_per_foot, m.weight_per_ft, m.price_per_lb_override,
        m.unit, m.cost_per_unit, m.supplier, m.sku, m.unit_price, m.taxable ? "yes" : "",
      ].map(esc).join(","));
    });
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "cost-items.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Every cost item for the org, used to suggest matches before an import.
export async function loadAllCostItems(orgId) {
  const all = [];
  let cursor;
  do {
    const page = await base44.entities.MaterialPriceList.filter({ organization_id: orgId }, { sort: "name", limit: 500, cursor });
    all.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor && all.length < 5000);
  return all;
}

// Reads the CSV into review rows. Each row keeps only the fields its cells actually
// fill in, and carries a suggested match: exact SKU first, then an exact item name.
export function parseCostItemsCsv(text, { costCodes = [], existing = [] } = {}) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const cell = (r, k) => {
    const i = head.indexOf(k);
    return i === -1 ? "" : (r[i] ?? "").trim();
  };

  const bySku = new Map();
  const byName = new Map();
  existing.forEach((m) => {
    const sku = (m.sku || "").trim();
    if (sku) bySku.set(sku, [...(bySku.get(sku) || []), m]);
    const name = (m.name || "").trim().toLowerCase();
    if (name) byName.set(name, [...(byName.get(name) || []), m]);
  });

  return rows.slice(1).map((r, index) => {
    const values = {};
    const put = (field, val) => { if (val !== "" && val != null) values[field] = val; };

    put("name", cell(r, "name"));
    put("category", cell(r, "shape"));
    put("cost_type", cell(r, "cost_type"));
    put("supplier", cell(r, "supplier"));
    put("sku", cell(r, "sku"));
    put("unit", cell(r, "unit"));

    const usedAs = cell(r, "used_as");
    if (usedAs) put("component_type", usedAs.split(";").map((x) => x.trim()).filter(Boolean));

    const codeNames = cell(r, "cost_codes");
    if (codeNames) {
      const names = codeNames.split(";").map((x) => x.trim().toLowerCase()).filter(Boolean);
      const ids = costCodes.filter((c) => names.includes((c.name || "").toLowerCase())).map((c) => c.id);
      if (ids.length) put("cost_code_ids", ids);
    }

    const method = cell(r, "cost_method");
    if (method) put("cost_method", ["weight", "unit"].includes(method) ? method : "linear_foot");

    Object.entries(NUMERIC).forEach(([key, field]) => {
      const raw = cell(r, key);
      if (raw !== "") put(field, parseFloat(raw) || 0);
    });

    const taxable = cell(r, "taxable").toLowerCase();
    if (cell(r, "taxable") !== "") put("taxable", ["yes", "true", "1"].includes(taxable));

    const name = (values.name || "").trim();
    if (!name) return { key: `row-${index}`, values, invalid: "Missing item name", matchId: null };

    const sku = (values.sku || "").trim();
    const skuHits = sku ? bySku.get(sku) || [] : [];
    const nameHits = byName.get(name.toLowerCase()) || [];
    const hits = skuHits.length ? skuHits : nameHits;
    const from = skuHits.length ? "SKU" : "Name";

    return {
      key: `row-${index}`,
      values,
      invalid: null,
      suggested: hits.length === 1 ? hits[0].id : null,
      matchId: hits.length === 1 ? hits[0].id : null,
      matchFrom: hits.length === 1 ? from : null,
      ambiguous: hits.length > 1 ? hits.length : 0,
    };
  });
}

// Builds the field set for a brand-new item: blank CSV cells fall back to the defaults.
function buildRecord(values) {
  const method = values.cost_method || "linear_foot";
  const rec = {
    name: values.name,
    category: values.category || "Other",
    cost_type: values.cost_type || "Materials",
    component_type: values.component_type?.length ? values.component_type : ["Other"],
    cost_code_ids: values.cost_code_ids || [],
    cost_method: method,
    stock_length_ft: values.stock_length_ft || 0,
    cost_per_stick: values.cost_per_stick || 0,
    weight_per_ft: values.weight_per_ft || 0,
    supplier: values.supplier || "",
    sku: values.sku || "",
    taxable: !!values.taxable,
    active: true,
  };
  if (values.price_per_lb_override != null) rec.price_per_lb_override = values.price_per_lb_override;
  if (values.unit_price != null) rec.unit_price = values.unit_price;
  if (method === "unit") {
    rec.unit = values.unit || "";
    rec.cost_per_unit = values.cost_per_unit || 0;
  } else {
    rec.cost_per_foot = calcCostPerFoot({
      method, stock: rec.stock_length_ft, stick: rec.cost_per_stick, typedCostPerFoot: values.cost_per_foot || 0,
      weightPerFt: rec.weight_per_ft, pricePerLb: values.price_per_lb_override,
    });
  }
  return rec;
}

// An update only carries the fields the row filled in; cost_per_foot is re-derived
// when the row touched any of its inputs, otherwise it stays as it was.
function buildPatch(values, current) {
  const patch = { ...values };
  if (!COST_INPUTS.some((k) => k in values)) return patch;
  const eff = { ...current, ...values };
  const method = eff.cost_method || "linear_foot";
  if (method !== "unit") {
    patch.cost_per_foot = calcCostPerFoot({
      method, stock: eff.stock_length_ft, stick: eff.cost_per_stick, typedCostPerFoot: eff.cost_per_foot,
      weightPerFt: eff.weight_per_ft, pricePerLb: eff.price_per_lb_override,
    });
  }
  return patch;
}

// Applies the reviewed rows: matched rows update their item, the rest are added.
export async function applyCostItemImport(rows, { orgId, existing }) {
  const byId = new Map(existing.map((m) => [m.id, m]));
  const usable = rows.filter((r) => !r.invalid);
  const updates = usable.filter((r) => r.matchId).map((r) => ({ id: r.matchId, ...buildPatch(r.values, byId.get(r.matchId) || {}) }));
  const creates = usable.filter((r) => !r.matchId).map((r) => ({ ...buildRecord(r.values), organization_id: orgId }));
  for (let i = 0; i < updates.length; i += 200) await base44.entities.MaterialPriceList.bulkUpdate(updates.slice(i, i + 200));
  for (let i = 0; i < creates.length; i += 200) await base44.entities.MaterialPriceList.bulkCreate(creates.slice(i, i + 200));
  return { updated: updates.length, created: creates.length };
}