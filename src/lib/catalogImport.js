// Catalog › Import: CSV parsing, column auto-mapping, value resolution and batched writes
// into MaterialPriceList (the catalog's cost items).

import { base44 } from "@/api/base44Client";
import { COST_TYPES, calcCostPerFoot } from "@/lib/costItems";

export const IGNORE = "__ignore__";
export const KEEP = "__keep__";

// Fields a cost item import can fill. Anything the catalog has no home for is left out.
export const IMPORT_FIELDS = [
  { key: "cost_group", label: "Cost Group Name", hint: "Semicolon paths (Railings; Interior; Cable) import as their last level." },
  { key: "sku", label: "Cost Item ID", hint: "Matches an existing item by ID before anything else." },
  { key: "name", label: "Cost Item Name", hint: "Required. Items with no ID are matched by name." },
  { key: "unit", label: "Unit", hint: "LF, EA, sheet… Must match a unit already in the catalog." },
  { key: "unit_cost", label: "Unit Cost", hint: "Cost of one unit. A length unit stores it as the stick price when a stick length exists." },
  { key: "unit_price", label: "Unit Price", hint: "Optional sell price for the item." },
  { key: "price_per_lb", label: "Price per lb", hint: "$/lb for materials priced by weight." },
  { key: "cost_code", label: "Cost Code", hint: "Semicolons list more than one code." },
  { key: "cost_type", label: "Cost Type", hint: "Materials, Labor, Subcontractor, Equipment or Other." },
  { key: "taxable", label: "Taxable", hint: "true / false. Defaults to true." },
];

const ALIASES = {
  cost_group: ["costgroup", "group", "category", "shape"],
  sku: ["costitemid", "itemid", "sku", "partnumber", "id"],
  name: ["costitemname", "itemname", "name"],
  unit: ["unit", "uom", "unitofmeasure"],
  unit_cost: ["unitcost", "cost", "costperunit", "costperfoot"],
  unit_price: ["unitprice", "price", "sellprice"],
  price_per_lb: ["priceperlb", "priceperpound", "pplb"],
  cost_code: ["costcode", "costcodes", "code"],
  cost_type: ["costtype", "type"],
  taxable: ["taxable", "tax"],
};

export const normHeader = (h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Normalized header → field key. First header that claims a field keeps it.
export function autoMap(headers) {
  const lookup = new Map();
  IMPORT_FIELDS.forEach((f) => {
    lookup.set(normHeader(f.label), f.key);
    (ALIASES[f.key] || []).forEach((a) => { if (!lookup.has(a)) lookup.set(a, f.key); });
  });
  const out = {};
  headers.forEach((h) => {
    const key = normHeader(h);
    const field = lookup.get(key);
    if (field && !Object.values(out).includes(field)) out[key] = field;
  });
  return out;
}

function detectDelimiter(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim() !== "") || "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let quoted = false;
  for (const ch of first) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch] += 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCsv(text, delim) {
  const rows = [];
  let row = [], cur = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

// { headers, rows } with blank lines dropped. Rows stay as raw cell arrays.
export function parseCsvText(text) {
  const clean = String(text || "").replace(/^\uFEFF/, "");
  const all = parseCsv(clean, detectDelimiter(clean));
  if (!all.length) throw new Error("That file has no rows.");
  const headers = all[0].map((h) => h.trim());
  const rows = all.slice(1).map((r) => headers.map((_, i) => r[i] ?? ""));
  if (!rows.length) throw new Error("That file has a header row but no items.");
  return { headers, rows };
}

const esc = (v) => {
  const t = v == null ? "" : String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function buildTemplateCsv() {
  const head = IMPORT_FIELDS.map((f) => f.label);
  const example = ["Railings; Interior; Cable", "CI-1001", 'Cable Railing Kit 36"', "LF", "42.50", "68.00", "", "5100 - Railing Materials", "Materials", "true"];
  return [head, example].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadCsv(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// The raw CSV values this row provides, keyed by field.
export function mappedValues(cells, headers, mapping) {
  const out = {};
  headers.forEach((h, i) => {
    const key = mapping[normHeader(h)];
    if (!key || key === IGNORE || out[key] !== undefined) return;
    const raw = String(cells[i] ?? "").trim();
    if (raw) out[key] = raw;
  });
  return out;
}

const codeNames = (costCodes) =>
  new Map(costCodes.map((c) => [String(c.name || "").trim().toLowerCase(), c]));

// Unique incoming values that do not exist in FabTrack settings yet, per field.
export function collectUnmatched(rows, headers, mapping, { costCodes = [], units = [] } = {}) {
  const codes = codeNames(costCodes);
  const unitSet = new Set(units.map((u) => String(u).trim().toLowerCase()));
  const typeSet = new Set(COST_TYPES.map((t) => t.toLowerCase()));
  const out = { cost_code: [], cost_type: [], unit: [] };
  const seen = { cost_code: new Set(), cost_type: new Set(), unit: new Set() };
  const push = (field, value) => {
    if (!value || seen[field].has(value)) return;
    seen[field].add(value);
    out[field].push(value);
  };

  rows.forEach(({ cells }) => {
    const v = mappedValues(cells, headers, mapping);
    if (v.cost_type && !typeSet.has(v.cost_type.toLowerCase())) push("cost_type", v.cost_type);
    if (v.unit && !unitSet.has(v.unit.toLowerCase())) push("unit", v.unit);
    if (v.cost_code) {
      v.cost_code.split(";").map((x) => x.trim()).filter(Boolean)
        .forEach((n) => { if (!codes.has(n.toLowerCase())) push("cost_code", n); });
    }
  });
  return out;
}

// True when most of the Unit column is plain numbers — usually a mapped-wrong-column sign.
export function unitLooksNumeric(rows, headers, mapping) {
  const vals = rows.map(({ cells }) => mappedValues(cells, headers, mapping).unit).filter(Boolean);
  if (!vals.length) return false;
  const numeric = vals.filter((v) => /^\$?\s*[\d.,\s-]+$/.test(v)).length;
  return numeric / vals.length > 0.5;
}

const toNum = (v) => {
  const s = String(v ?? "").replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const toBool = (v, fallback = true) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  if (["true", "yes", "y", "1", "t"].includes(s)) return true;
  if (["false", "no", "n", "0", "f"].includes(s)) return false;
  return fallback;
};

const leafGroup = (v) => String(v || "").split(";").map((x) => x.trim()).filter(Boolean).pop() || "";

const LENGTH_UNIT = /^(lf|lft|ft|ft\.|foot|feet|linear\s*f(ee)?t|lin\.?\s*ft)$/i;

const lookup = (map, key) => {
  if (!map || !key) return null;
  if (map[key]) return map[key];
  const needle = String(key).toLowerCase();
  const hit = Object.entries(map).find(([k]) => k.toLowerCase() === needle);
  return hit ? hit[1] : null;
};

const round2 = (n) => Math.round(n * 100) / 100;

const itemKey = (name, type, codeIds, unit) =>
  [String(name || "").trim().toLowerCase(), String(type || "").trim().toLowerCase(),
    [...(codeIds || [])].sort().join(","), String(unit || "").trim().toLowerCase()].join("|");

// Turns one row's raw values into catalog field values, using the value mappings.
function resolveRow(values, { resolved, costCodes }) {
  const out = {};
  if (values.name) out.name = values.name;
  if (values.sku) out.sku = values.sku;
  if (values.cost_group) out.category = leafGroup(values.cost_group);

  if (values.cost_type) {
    out.cost_type = lookup(resolved.cost_type, values.cost_type)
      || COST_TYPES.find((t) => t.toLowerCase() === values.cost_type.toLowerCase())
      || "Materials";
  }
  if (values.unit) {
    const mapped = lookup(resolved.unit, values.unit);
    out.unit = !mapped || mapped === KEEP ? values.unit : mapped;
  }
  if (values.unit_price != null) {
    const n = toNum(values.unit_price);
    if (n != null) out.unit_price = n;
  }
  if (values.price_per_lb != null) {
    const n = toNum(values.price_per_lb);
    if (n != null) out.price_per_lb_override = n;
  }
  if (values.taxable != null) out.taxable = toBool(values.taxable, true);

  if (values.cost_code) {
    const codes = codeNames(costCodes);
    const ids = values.cost_code.split(";").map((x) => x.trim()).filter(Boolean)
      .map((n) => lookup(resolved.cost_code, n) || codes.get(n.toLowerCase())?.id)
      .filter(Boolean);
    if (ids.length) out.cost_code_ids = [...new Set(ids)];
  }
  return out;
}

// Cost model fields for the row; the item's stick length is respected when it has one.
function costFields(values, out, current) {
  const cost = values.unit_cost != null ? toNum(values.unit_cost) : null;
  const unit = String(out.unit || current?.unit || "").trim();
  const fields = {};
  if (cost != null) {
    // No unit at all is treated as a length, the catalog's normal basis.
    if (!unit || LENGTH_UNIT.test(unit)) {
      const stock = Number(current?.stock_length_ft || 0);
      const stick = stock > 0 ? round2(cost * stock) : 0;
      fields.cost_method = "linear_foot";
      fields.cost_per_stick = stick;
      fields.cost_per_foot = calcCostPerFoot({ method: "linear_foot", stock, stick, typedCostPerFoot: cost, weightPerFt: 0, pricePerLb: 0 });
    } else {
      fields.cost_method = "unit";
      fields.cost_per_unit = cost;
    }
  } else if (out.price_per_lb_override != null) {
    fields.cost_method = "weight";
    fields.cost_per_foot = calcCostPerFoot({
      method: "weight", stock: 0, stick: 0, typedCostPerFoot: 0,
      weightPerFt: current?.weight_per_ft, pricePerLb: out.price_per_lb_override,
    });
  }
  return fields;
}

const BATCH = 25;

// Applies the rows: matched items are updated in batches, the rest are created.
export async function applyCatalogImport({ rows, headers, mapping, resolved = {}, orgId, existing = [], costCodes = [], onProgress }) {
  const bySku = new Map();
  const byKey = new Map();
  const byName = new Map();
  const index = (m) => {
    const sku = String(m.sku || "").trim().toLowerCase();
    if (sku) bySku.set(sku, m);
    byKey.set(itemKey(m.name, m.cost_type, m.cost_code_ids, m.unit), m);
    const n = String(m.name || "").trim().toLowerCase();
    if (n) byName.set(n, [...(byName.get(n) || []), m]);
  };
  existing.forEach(index);

  const statuses = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const meta = [];
    const updates = [];
    const creates = [];

    chunk.forEach(({ index: rowIndex, cells }) => {
      const values = mappedValues(cells, headers, mapping);
      const name = String(values.name || "").trim();
      if (!name) {
        statuses.push({ index: rowIndex, status: "error", name: "—", message: "No item name in that row" });
        return;
      }
      const out = resolveRow(values, { resolved, costCodes });
      const skuKey = String(out.sku || "").trim().toLowerCase();

      let match = skuKey ? bySku.get(skuKey) : null;
      if (!match) {
        match = byKey.get(itemKey(out.name, out.cost_type || "Materials", out.cost_code_ids, out.unit));
      }
      if (!match) {
        const hits = byName.get(name.toLowerCase()) || [];
        if (hits.length === 1) match = hits[0];
      }

      const costF = costFields(values, out, match);
      if (match) {
        updates.push({ id: match.id, ...out, ...costF });
        meta.push({ rowIndex, status: "updated", name });
      } else {
        creates.push({
          organization_id: orgId,
          name: out.name,
          category: out.category || "Other",
          cost_type: out.cost_type || "Materials",
          component_type: ["Other"],
          cost_code_ids: out.cost_code_ids || [],
          sku: out.sku || "",
          unit: out.unit || "",
          cost_method: costF.cost_method || "linear_foot",
          stock_length_ft: 0,
          cost_per_stick: costF.cost_per_stick || 0,
          cost_per_foot: costF.cost_per_foot || 0,
          cost_per_unit: costF.cost_per_unit || 0,
          weight_per_ft: 0,
          supplier: "",
          taxable: out.taxable !== false,
          active: true,
          ...(out.unit_price != null ? { unit_price: out.unit_price } : {}),
          ...(out.price_per_lb_override != null ? { price_per_lb_override: out.price_per_lb_override } : {}),
        });
        meta.push({ rowIndex, status: "created", name });
      }
    });

    try {
      if (updates.length) await base44.entities.MaterialPriceList.bulkUpdate(updates);
      if (creates.length) {
        const created = await base44.entities.MaterialPriceList.bulkCreate(creates);
        (Array.isArray(created) ? created : []).forEach(index);
      }
      statuses.push(...meta);
    } catch (e) {
      meta.forEach((m) => statuses.push({ ...m, status: "error", message: e?.message || "Could not save this row" }));
    }
    if (onProgress) onProgress(statuses.slice());
  }

  return statuses;
}