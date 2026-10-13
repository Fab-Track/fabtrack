import { base44 } from "@/api/base44Client";
import { calcCostPerFoot } from "@/lib/costItems";

const HEADERS = ["name", "shape", "cost_type", "used_as", "cost_codes", "cost_method", "stock_length_ft", "cost_per_stick", "cost_per_foot", "weight_per_ft", "price_per_lb", "unit", "cost_per_unit", "supplier", "sku", "unit_price", "taxable"];

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

// Creates cost items from a CSV file using the export's column names. Returns the number created.
export async function importCostItems(file, orgId, costCodes) {
  const rows = parseCsv(await file.text());
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (r, k) => (r[head.indexOf(k)] ?? "").trim();
  const n = (r, k) => parseFloat(col(r, k)) || 0;
  const records = rows.slice(1).filter((r) => col(r, "name")).map((r) => {
    const method = ["weight", "unit"].includes(col(r, "cost_method")) ? col(r, "cost_method") : "linear_foot";
    const codeNames = col(r, "cost_codes").split(";").map((x) => x.trim().toLowerCase()).filter(Boolean);
    const rec = {
      organization_id: orgId,
      name: col(r, "name"),
      category: col(r, "shape") || "Other",
      cost_type: col(r, "cost_type") || "Materials",
      component_type: col(r, "used_as") ? col(r, "used_as").split(";").map((x) => x.trim()) : ["Other"],
      cost_code_ids: costCodes.filter((c) => codeNames.includes(c.name.toLowerCase())).map((c) => c.id),
      cost_method: method,
      stock_length_ft: n(r, "stock_length_ft"),
      cost_per_stick: n(r, "cost_per_stick"),
      weight_per_ft: n(r, "weight_per_ft"),
      supplier: col(r, "supplier"),
      sku: col(r, "sku"),
      taxable: ["yes", "true", "1"].includes(col(r, "taxable").toLowerCase()),
      active: true,
    };
    if (n(r, "price_per_lb")) rec.price_per_lb_override = n(r, "price_per_lb");
    if (col(r, "unit_price")) rec.unit_price = n(r, "unit_price");
    if (method === "unit") { rec.unit = col(r, "unit"); rec.cost_per_unit = n(r, "cost_per_unit"); }
    else rec.cost_per_foot = calcCostPerFoot({
      method, stock: rec.stock_length_ft, stick: rec.cost_per_stick, typedCostPerFoot: n(r, "cost_per_foot"),
      weightPerFt: rec.weight_per_ft, pricePerLb: n(r, "price_per_lb"),
    });
    return rec;
  });
  for (let i = 0; i < records.length; i += 200) await base44.entities.MaterialPriceList.bulkCreate(records.slice(i, i + 200));
  return records.length;
}