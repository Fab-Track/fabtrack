/**
 * THE railing cost engine — single source of truth.
 *
 * Every surface that shows railing numbers (Catalog > Cost Groups > style preview,
 * estimate line items, "View takeoff", the Service Catalog component editor) calls
 * computeRailingCosts(). Never re-implement this math anywhere else: if a number
 * needs to change, it changes here.
 */

export const RAILING_SLOTS = ["Top Rail", "Bottom Rail", "Post", "Picket"];

/** Offset (inches) subtracted from post height to derive picket length (top + bottom rail + gap). */
const PICKET_LENGTH_OFFSET_IN = 6.5;

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Org-level railing standards and labor rates.
 * Accepts a raw AppSettings record, the full settings array, an already-resolved
 * object, or null — always returns the same normalized shape.
 */
export function resolveSettings(input) {
  let rec = null;
  if (Array.isArray(input)) rec = input.find((r) => r && r.setting_key === "main") || null;
  else if (input && typeof input === "object") rec = input;
  if (!rec) return null;
  const pick = (f) => (rec[f] != null && rec[f] > 0 ? rec[f] : 0);
  return {
    res_post_height_in: pick("res_post_height_in"),
    comm_post_height_in: pick("comm_post_height_in"),
    labor_fab_rate: pick("labor_fab_rate"),
    labor_install_rate: pick("labor_install_rate"),
    install_hours_per_day: pick("install_hours_per_day") || 8,
  };
}

/**
 * Resolve railing takeoff parameters: style override if not null, else category default.
 */
export function resolveRailingParams(catalogItem, category) {
  const cat = category || {};
  const pick = (f) => (catalogItem?.[f] != null ? catalogItem[f] : cat[f] ?? null);
  return {
    post_spacing_in: pick("post_spacing_in"),
    post_width_in: pick("post_width_in"),
    picket_clear_gap_in: pick("picket_clear_gap_in"),
    picket_width_in: pick("picket_width_in"),
    rail_runs: pick("rail_runs"),
  };
}

/**
 * Railing layout (posts, sections, pickets) for a given length. Returns null if inputs are missing.
 */
export function computeLayout({ catalogItem, settings, length, isResidential, category }) {
  const s = resolveSettings(settings);
  if (!catalogItem || !s || !length || length <= 0) return null;

  const { post_spacing_in, post_width_in, picket_clear_gap_in, picket_width_in, rail_runs } = resolveRailingParams(catalogItem, category);
  if (!post_spacing_in || !post_width_in || !picket_clear_gap_in || !picket_width_in || !rail_runs) return null;

  const postHeight = isResidential ? s.res_post_height_in : s.comm_post_height_in;
  if (!postHeight) return null;
  const picketLength = Math.max(0, postHeight - PICKET_LENGTH_OFFSET_IN);

  // inches = LF x 12; posts = max(1, ceil(inches / spacing)); net = inches - posts x post width
  const inches = length * 12;
  const posts = Math.max(1, Math.ceil(inches / post_spacing_in));
  const netIn = inches - posts * post_width_in;
  const sectionIn = netIn / posts;
  const picketsPerSection = Math.max(0, Math.ceil(sectionIn / (picket_width_in + picket_clear_gap_in)));
  const totalPickets = picketsPerSection * posts;

  return {
    params: { post_spacing_in, post_width_in, picket_clear_gap_in, picket_width_in, rail_runs },
    steps: { postsForNet: posts, netLength: netIn / 12, posts, sectionLength: sectionIn / 12, picketsPerSection, totalPickets, postHeight, picketLength },
    // top rail = LF; bottom rail = LF x (rail runs - 1)
    railFeet: length,
    topRailFeet: length,
    bottomRailFeet: length * Math.max(0, rail_runs - 1),
    postFeet: posts * (postHeight / 12),
    picketFeet: totalPickets * (picketLength / 12),
  };
}

/**
 * Cost one component line. `layout` may be null for non-railing items (Other lines only).
 * Returns null if the material is missing or has no usable cost.
 */
export function costComponent(c, mat, layout, length) {
  if (!mat) return null;
  const slot = c.slot || "Other";
  const isRail = slot === "Top Rail" || slot === "Bottom Rail";
  const isPost = slot === "Post";
  const isPicket = slot === "Picket";
  const label = slot === "Other" ? (c.label || "Other") : slot;

  let qty;
  if (slot === "Other") {
    // (qty per unit x job quantity + fixed qty) x (1 + waste)
    qty = ((c.qty_per_unit || 0) * (length || 0) + (c.fixed_qty || 0)) * (1 + (c.waste_pct || 0));
  } else if (!layout) {
    return null;
  }

  // Unit items are costed per piece: cost_per_unit x count.
  if (mat.cost_method === "unit") {
    if (!(mat.cost_per_unit > 0)) return null;
    if (slot !== "Other") qty = isPost ? layout.steps.posts : isPicket ? layout.steps.totalPickets : 1;
    return { component_label: label, slot, material_id: mat.id, material_name: mat.name, qty, qty_unit: mat.unit || "unit", unit_cost: mat.cost_per_unit, cost: qty * mat.cost_per_unit };
  }

  // Linear-foot and weight items are both costed from the calculated cost_per_foot.
  if (!(mat.cost_per_foot > 0)) return null;
  if (slot !== "Other") qty = isRail ? (slot === "Top Rail" ? layout.topRailFeet : layout.bottomRailFeet) : isPost ? layout.postFeet : layout.picketFeet;
  return { component_label: label, slot, material_id: mat.id, material_name: mat.name, qty, qty_unit: "ft", unit_cost: mat.cost_per_foot, cost: qty * mat.cost_per_foot };
}

/**
 * Aggregate component results by catalog material, rounding up to whole sticks.
 * Combines footage for the same material before stick calculation so the customer
 * pays for full sticks including leftover.
 */
export function aggregateMaterials(componentResults, materials) {
  const groups = {};
  for (const c of componentResults) {
    if (!c || !c.material_id) continue;
    const mat = (materials || []).find((m) => m.id === c.material_id);
    if (!mat) continue;
    const key = c.material_id;
    if (!groups[key]) {
      groups[key] = {
        material_id: key,
        material_name: c.material_name,
        total_qty: 0,
        qty_unit: c.qty_unit,
        stock_length_ft: mat.stock_length_ft || 0,
        cost_per_stick: mat.cost_per_stick || 0,
        cost_per_foot: mat.cost_per_foot || 0,
        cost_method: mat.cost_method || "linear_foot",
      };
    }
    groups[key].total_qty += c.qty;
  }

  return Object.values(groups).map((g) => {
    let sticks = 0;
    let material_cost = 0;

    if (g.cost_method === "unit") {
      // Unit items: no stick rounding, cost per piece
      material_cost = g.total_qty * g.cost_per_foot; // cost_per_foot holds cost_per_unit for unit items
    } else if (g.stock_length_ft > 0 && g.cost_per_stick > 0) {
      // Stick pricing: round up to whole sticks
      sticks = Math.ceil(g.total_qty / g.stock_length_ft);
      material_cost = sticks * g.cost_per_stick;
    } else {
      // Fallback: per-foot pricing (no stick rounding)
      material_cost = g.total_qty * g.cost_per_foot;
    }

    return { ...g, sticks, material_cost };
  });
}

/**
 * Warnings for a railing style's component list (display only, never auto-fixed).
 */
export function componentWarnings(components, layout) {
  const list = components || [];
  const warnings = [];
  RAILING_SLOTS.forEach((slot) => {
    if (list.filter((c) => c.slot === slot).length > 1) warnings.push(`More than one line in the ${slot} slot.`);
  });
  const hasPosts = layout ? layout.steps.posts > 0 : true;
  const hasPickets = layout ? layout.steps.totalPickets > 0 : true;
  if (hasPosts && !list.some((c) => c.slot === "Post")) warnings.push("This style has posts but no Post line.");
  if (hasPickets && !list.some((c) => c.slot === "Picket")) warnings.push("This style has pickets but no Picket line.");
  return warnings;
}

/**
 * THE calculation. One style + one length + the org railing standards in, and you get
 * the layout and the same four hard-cost parts every time — materials (whole sticks),
 * fabrication, powder coat and install — plus the labor hours behind them.
 *
 * @param {object}  args.catalogItem  ServiceCatalog item carrying the railing spec
 * @param {object}  args.category     its CatalogCategory (railing defaults live here)
 * @param {object|array} args.settings AppSettings record / records / resolved settings
 * @param {array}   args.materials    MaterialPriceList records
 * @param {number}  args.length       run length in linear feet
 * @param {boolean} args.isResidential residential (true) or commercial (false) height
 */
export function computeRailingCosts({ catalogItem, category, settings, materials, length, isResidential = true }) {
  const s = resolveSettings(settings);
  const qty = num(length);
  const rows = catalogItem?.components || [];
  const railing = !!(category?.is_railing || catalogItem?.is_railing);

  const layout = railing && s ? computeLayout({ catalogItem, category, settings: s, length: qty, isResidential }) : null;

  // Row-aligned results (nulls kept) for component tables, then the resolved ones for costing.
  const componentResults = rows.map((c) => costComponent(c, (materials || []).find((m) => m.id === c.material_id), layout, qty));
  const components = componentResults.filter(Boolean);
  const materialLines = aggregateMaterials(components, materials);

  const fabHours = num(catalogItem?.cost_fab_hours_per_unit) / 10 * qty;
  const installHours = num(catalogItem?.cost_install_hours_per_unit) / 10 * qty;

  const costs = {
    materials: r2(materialLines.reduce((a, m) => a + m.material_cost, 0)),
    fabrication: r2(fabHours * num(s?.labor_fab_rate)),
    powder_coat: r2(num(catalogItem?.cost_powder_coat_per_unit) * qty),
    install: r2(installHours * num(catalogItem?.cost_install_crew_size) * num(s?.labor_install_rate)),
  };
  const hardCost = r2(costs.materials + costs.fabrication + costs.powder_coat + costs.install);

  const hoursPerDay = num(s?.install_hours_per_day) || 8;
  const hours = {
    fabrication: r2(fabHours),
    install: r2(installHours),
    installDays: installHours > 0 ? Math.ceil(installHours / hoursPerDay) : 0,
  };

  let warn = null;
  if (railing && !layout) warn = "Missing railing standards or layout defaults";
  else if (components.length < rows.length) warn = "A component is missing its material or cost";

  return {
    isRailing: railing,
    settings: s,
    layout,
    componentResults,
    components,
    materialLines,
    costs,
    hours,
    hardCost,
    costPerUnit: qty > 0 ? r2(hardCost / qty) : 0,
    warn,
  };
}