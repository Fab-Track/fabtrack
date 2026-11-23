/**
 * THE railing cost engine — single source of truth.
 *
 * Every surface that shows railing numbers (Catalog > Cost Groups > style preview,
 * estimate line items, "View takeoff", the Service Catalog component editor) calls
 * computeRailingCosts(). Never re-implement this math anywhere else: if a number
 * needs to change, it changes here.
 */

export const RAILING_SLOTS = ["Top Rail", "Bottom Rail", "Post", "Picket"];

/** Fallback rail profile height when a style has none on file. */
const DEFAULT_RAIL_HEIGHT_IN = 1.5;
/** Clear gap under the bottom rail — the shop standard, 3-11/16". */
const DEFAULT_BOTTOM_CLEARANCE_IN = 3.6875;

export const isInfillType = (item) => item?.infill_type === "Mesh" || item?.infill_type === "Glass";

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
  // Zero is a real value here (flush bottom rail).
  const numOr = (f, fallback) => (rec[f] != null && Number.isFinite(Number(rec[f])) ? Number(rec[f]) : fallback);
  return {
    res_post_height_in: pick("res_post_height_in"),
    comm_post_height_in: pick("comm_post_height_in"),
    rail_bottom_clearance_in: numOr("rail_bottom_clearance_in", DEFAULT_BOTTOM_CLEARANCE_IN),
    material_costing_mode: rec.material_costing_mode || "Whole sticks",
    labor_fab_rate: pick("labor_fab_rate"),
    labor_install_rate: pick("labor_install_rate"),
    install_hours_per_day: pick("install_hours_per_day") || 8,
  };
}

/**
 * Resolve railing takeoff parameters: style override if not null, else category default.
 * Post and picket sizes have no style-level field — they come from the component
 * materials, with the category value as the fallback.
 */
export function resolveRailingParams(catalogItem, category) {
  const cat = category || {};
  const pick = (f) => (catalogItem?.[f] != null ? catalogItem[f] : cat[f] ?? null);
  const catOnly = (f) => (cat[f] ?? null);
  return {
    post_spacing_in: pick("post_spacing_in"),
    post_width_in: catOnly("post_width_in"),
    picket_clear_gap_in: pick("picket_clear_gap_in"),
    picket_width_in: catOnly("picket_width_in"),
    picket_height_in: catOnly("picket_height_in"),
    rail_runs: pick("rail_runs"),
  };
}

const DIM_RE = /(\d+\s+\d+\/\d+|\d+-\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*"/g;
const toInches = (t) => {
  const mixed = t.match(/^(\d+)[\s-](\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(t);
};

/**
 * Material cross-section read from its name — `SQUARE TUBE 1/2" × 1/2" × 0.065"`
 * gives 0.5" wide by 0.5" tall, `FLATBAR 1/2" × 2"` gives 0.5" wide by 2" tall.
 * The first two dimensions are the cross-section; a third is wall thickness and is ignored.
 */
export function materialCrossSection(mat) {
  const dims = [...(mat?.name || "").matchAll(DIM_RE)].map((m) => toInches(m[1])).filter((n) => n > 0);
  if (!dims.length) return null;
  return { width: dims[0], height: dims[1] ?? dims[0] };
}

/** The material assigned to a style's component slot. */
export function materialForSlot(catalogItem, materials, slot) {
  const row = (catalogItem?.components || []).find((c) => c.slot === slot);
  return (materials || []).find((m) => m.id === row?.material_id) || null;
}

/**
 * Railing layout (posts, sections, pickets) for a given length. Returns null if inputs are missing.
 * Post, picket and rail sizes are read from the materials assigned to their component slots;
 * a value typed on the style only stands in when that material has no size on file.
 */
export function computeLayout({ catalogItem, settings, length, isResidential, category, materials }) {
  const s = resolveSettings(settings);
  if (!catalogItem || !s || !length || length <= 0) return null;

  const p = resolveRailingParams(catalogItem, category);
  const { post_spacing_in, picket_clear_gap_in, rail_runs } = p;
  const cross = materialCrossSection(materialForSlot(catalogItem, materials, "Picket"));
  // Post and picket sizes follow the material assigned to their slot, like the rails do;
  // the category default only stands in when the material has no size on file.
  const post_width_in = materialCrossSection(materialForSlot(catalogItem, materials, "Post"))?.height ?? num(p.post_width_in);
  const picket_width_in = cross?.height ?? (num(p.picket_width_in) || cross?.width || 0);
  const picket_height_in = num(p.picket_height_in) || cross?.height || 0;
  if (!post_spacing_in || !post_width_in || !picket_clear_gap_in || !rail_runs) return null;
  if (!picket_width_in && !picket_height_in) return null;

  // Overall railing height (floor to top of the top rail) — posts are cut to this.
  const railingHeight = isResidential ? s.res_post_height_in : s.comm_post_height_in;
  if (!railingHeight) return null;

  const orientation = catalogItem.picket_orientation || "Vertical";
  const horizontal = orientation === "Horizontal";
  const infill = catalogItem.infill_type || "Pickets";
  // Rail profile heights come from the rail materials' own cross-sections.
  const railProfile = (slot, stored) =>
    materialCrossSection(materialForSlot(catalogItem, materials, slot))?.height || num(stored) || DEFAULT_RAIL_HEIGHT_IN;
  const topRailHeight = railProfile("Top Rail", catalogItem.top_rail_height_in);
  const bottomRailHeight = railProfile("Bottom Rail", catalogItem.bottom_rail_height_in);
  // Clearance under the bottom rail: the style's own value wins, else the org standard.
  const bottomClearance = num(
    catalogItem.floor_to_bottom_rail_in ?? s.rail_bottom_clearance_in ?? DEFAULT_BOTTOM_CLEARANCE_IN
  );
  // Open height between the rails — the space infill fills.
  const clearHeight = Math.max(0, railingHeight - topRailHeight - bottomRailHeight - bottomClearance);

  // Posts: the shop formula fits the post width inside every spacing module, min 2 posts.
  // Bays are the spaces between posts — one fewer than the posts.
  const inches = length * 12;
  const posts = Math.max(2, Math.ceil((inches * (post_spacing_in - post_width_in)) / (post_spacing_in ** 2)) + 1);
  const bays = Math.max(1, posts - 1);
  const netIn = Math.max(0, inches - posts * post_width_in);
  const bayIn = netIn / bays;

  // Horizontal: pickets run the bay width and stack up the clear height, spaced by their
  // vertical thickness. Vertical: pickets run the clear height and are spaced across the
  // bay width. Either way n bars leave n+1 gaps, so one gap comes off the span.
  const barSpan = horizontal
    ? (num(picket_height_in) || num(picket_width_in))
    : (num(picket_width_in) || num(picket_height_in));
  const spanIn = horizontal ? clearHeight : bayIn;
  // Round up so the gap between bars never exceeds the max clear gap.
  const picketsPerSection = barSpan > 0
    ? Math.max(0, Math.ceil((spanIn - picket_clear_gap_in) / (picket_clear_gap_in + barSpan)))
    : 0;
  const totalPickets = picketsPerSection * bays;
  const picketLength = horizontal ? bayIn : clearHeight;
  const infillSqFt = isInfillType({ infill_type: infill }) ? (bayIn * clearHeight * bays) / 144 : 0;

  return {
    params: { post_spacing_in, post_width_in, picket_clear_gap_in, picket_width_in, picket_height_in, rail_runs },
    steps: {
      postsForNet: posts, netLength: netIn / 12, posts, bays, sectionLength: bayIn / 12, bayWidth: bayIn,
      picketsPerSection, totalPickets, postHeight: railingHeight, railingHeight, picketLength,
      picketWidth: picket_width_in, picketHeight: picket_height_in,
      clearHeight, clearWidth: bayIn, orientation, infill,
      topRailHeight, bottomRailHeight, bottomClearance, infillSqFt: r2(infillSqFt),
    },
    // rails are net of the posts: LF per run; bottom rail = run x (rail runs - 1)
    railFeet: netIn / 12,
    topRailFeet: inches / 12,
    bottomRailFeet: (netIn / 12) * Math.max(0, rail_runs - 1),
    postFeet: posts * (railingHeight / 12),
    picketFeet: totalPickets * (picketLength / 12),
    infillSqFt: r2(infillSqFt),
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
 * Aggregate component results by catalog material.
 * Combines footage for the same material across every slot first (rails and posts
 * that use the same tube are pooled), then:
 *   "Whole sticks"  — rounds up to full stock lengths x cost per stick (customer pays the leftover).
 *   "Per foot used" — charges only the feet the layout needs, at cost per foot.
 */
export function aggregateMaterials(componentResults, materials, costingMode = "Whole sticks") {
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
        // Unit items carry their per-piece cost here so aggregation never loses it.
        cost_per_foot: mat.cost_method === "unit" ? num(mat.cost_per_unit) : num(mat.cost_per_foot),
        cost_method: mat.cost_method || "linear_foot",
      };
    }
    groups[key].total_qty += c.qty;
  }

  const perFootMode = costingMode === "Per foot used";

  return Object.values(groups).map((g) => {
    let sticks = 0;
    let leftover_ft = 0;
    let material_cost = 0;

    if (g.cost_method === "unit") {
      // Unit items: no stick rounding, cost per piece
      material_cost = g.total_qty * g.cost_per_foot; // cost_per_foot holds cost_per_unit for unit items
    } else if (!perFootMode && g.stock_length_ft > 0 && g.cost_per_stick > 0) {
      // Stick pricing: round up to whole sticks, leftover included in the cost
      sticks = Math.ceil(g.total_qty / g.stock_length_ft);
      material_cost = sticks * g.cost_per_stick;
      leftover_ft = r2(sticks * g.stock_length_ft - g.total_qty);
    } else {
      // Per foot used (or no stick price on file): feet needed x cost per foot
      material_cost = g.total_qty * g.cost_per_foot;
    }

    return { ...g, sticks, leftover_ft, material_cost };
  });
}

/**
 * Warnings for a railing style's component list (display only, never auto-fixed).
 */
export function componentWarnings(components, layout, infillType) {
  const list = components || [];
  const warnings = [];
  const infill = infillType || layout?.steps?.infill || "Pickets";
  RAILING_SLOTS.forEach((slot) => {
    if (list.filter((c) => c.slot === slot).length > 1) warnings.push(`More than one line in the ${slot} slot.`);
  });
  const hasPosts = layout ? layout.steps.posts > 0 : true;
  const hasPickets = infill === "Pickets" && (layout ? layout.steps.totalPickets > 0 : true);
  if (hasPosts && !list.some((c) => c.slot === "Post")) warnings.push("This style has posts but no Post line.");
  if (hasPickets && !list.some((c) => c.slot === "Picket")) warnings.push("This style has pickets but no Picket line.");
  return warnings;
}

/**
 * THE calculation. One style + one length + the org railing standards in, and you get
 * the layout and the same four hard-cost parts every time — materials (whole sticks or
 * per foot used, per the org's material costing setting),
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

  const layout = railing && s ? computeLayout({ catalogItem, category, settings: s, length: qty, isResidential, materials }) : null;

  // Row-aligned results (nulls kept) for component tables, then the resolved ones for costing.
  const infill = catalogItem?.infill_type || "Pickets";
  // A Picket line only counts when the style is actually infilled with pickets.
  const costedRows = rows.filter((c) => c.slot !== "Picket" || infill === "Pickets");
  const componentResults = rows.map((c) =>
    costedRows.includes(c) ? costComponent(c, (materials || []).find((m) => m.id === c.material_id), layout, qty) : null
  );
  const components = componentResults.filter(Boolean);

  // Mesh/Glass infill: priced per square foot of open area, from the style's infill cost item.
  const infillMaterial = isInfillType({ infill_type: infill })
    ? (materials || []).find((m) => m.id === catalogItem?.infill_material_id)
    : null;
  const infillSqFt = layout?.infillSqFt || 0;
  const infillRate = infillMaterial
    ? (infillMaterial.cost_method === "unit" ? num(infillMaterial.cost_per_unit) : num(infillMaterial.cost_per_foot))
    : 0;
  const infillLine = infillMaterial && infillSqFt > 0 && infillRate > 0
    ? {
        component_label: `${infill} infill`, slot: "Infill", material_id: infillMaterial.id, material_name: infillMaterial.name,
        qty: infillSqFt, qty_unit: "sqft", unit_cost: infillRate, cost: r2(infillSqFt * infillRate),
      }
    : null;

  const allComponents = infillLine ? [...components, infillLine] : components;
  const materialLines = aggregateMaterials(allComponents, materials, s?.material_costing_mode);

  // Standard fabrication hours per 10 units, as entered on the style (Labor and Finish).
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
  else if (components.length < costedRows.length) warn = "A component is missing its material or cost";
  else if (isInfillType({ infill_type: infill }) && !infillLine) warn = `The ${infill} infill cost item is missing or has no price`;

  return {
    isRailing: railing,
    settings: s,
    layout,
    componentResults,
    components: allComponents,
    materialLines,
    costs,
    hours,
    hardCost,
    costPerUnit: qty > 0 ? r2(hardCost / qty) : 0,
    warn,
  };
}