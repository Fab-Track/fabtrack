/**
 * Railing takeoff calculation utilities.
 * Reads from Service Catalog item parameters and components, MaterialPriceList,
 * and org-level AppSettings to compute hard cost and final price.
 */

export const RAILING_SLOTS = ["Top Rail", "Bottom Rail", "Post", "Picket"];

/**
 * Build the settings object from AppSettings records.
 * Labor rates and railing standards come from the "main" row only.
 */
export function resolveSettings(records) {
  if (!records || records.length === 0) return null;
  const main = records.find(r => r.setting_key === "main");
  const mainVal = (field) => (main && main[field] != null && main[field] > 0 ? main[field] : 0);
  return {
    res_post_height_in: mainVal("res_post_height_in"),
    res_picket_length_in: mainVal("res_picket_length_in"),
    comm_post_height_in: mainVal("comm_post_height_in"),
    comm_picket_length_in: mainVal("comm_picket_length_in"),
    labor_fab_rate: mainVal("labor_fab_rate"),
    labor_install_rate: mainVal("labor_install_rate"),
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
  if (!catalogItem || !settings || !length || length <= 0) return null;

  const { post_spacing_in, post_width_in, picket_clear_gap_in, picket_width_in, rail_runs } = resolveRailingParams(catalogItem, category);
  if (!post_spacing_in || !post_width_in || !picket_clear_gap_in || !picket_width_in || !rail_runs) return null;

  const postHeight = isResidential ? settings.res_post_height_in : settings.comm_post_height_in;
  const picketLength = isResidential ? settings.res_picket_length_in : settings.comm_picket_length_in;
  if (!postHeight || !picketLength) return null;

  // Step 1: Net length (subtract post widths)
  const postsForNet = Math.ceil(length * 12 / post_spacing_in);
  const netLength = length - (postsForNet * post_width_in / 12);

  // Step 2: Posts
  const posts = Math.ceil(netLength / (post_spacing_in / 12));

  // Step 3: Section length
  const sectionLength = netLength / posts;

  // Step 4: Pickets
  const picketsPerSection = Math.ceil((sectionLength * 12 - picket_width_in) / (picket_clear_gap_in + picket_width_in));
  const totalPickets = picketsPerSection * posts;

  return {
    params: { post_spacing_in, post_width_in, picket_clear_gap_in, picket_width_in, rail_runs },
    steps: { postsForNet, netLength, posts, sectionLength, picketsPerSection, totalPickets, postHeight, picketLength },
    // Step 5-6: Feet needed per component type
    // Each rail component gets one rail run = length
    railFeet: length,
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
    return { component_label: label, slot, material_name: mat.name, qty, qty_unit: mat.unit || "unit", unit_cost: mat.cost_per_unit, cost: qty * mat.cost_per_unit };
  }

  // Linear-foot and weight items are both costed from the calculated cost_per_foot.
  if (!(mat.cost_per_foot > 0)) return null;
  if (slot !== "Other") qty = isRail ? layout.railFeet : isPost ? layout.postFeet : layout.picketFeet;
  return { component_label: label, slot, material_name: mat.name, qty, qty_unit: "ft", unit_cost: mat.cost_per_foot, cost: qty * mat.cost_per_foot };
}

/**
 * Warnings for a railing style's component list (display only, never auto-fixed).
 */
export function componentWarnings(components, layout) {
  const list = components || [];
  const warnings = [];
  RAILING_SLOTS.forEach(slot => {
    if (list.filter(c => c.slot === slot).length > 1) warnings.push(`More than one line in the ${slot} slot.`);
  });
  const hasPosts = layout ? layout.steps.posts > 0 : true;
  const hasPickets = layout ? layout.steps.totalPickets > 0 : true;
  if (hasPosts && !list.some(c => c.slot === "Post")) warnings.push("This style has posts but no Post line.");
  if (hasPickets && !list.some(c => c.slot === "Picket")) warnings.push("This style has pickets but no Picket line.");
  return warnings;
}

/**
 * Compute railing takeoff from catalog item (its components), materials, settings, and category.
 * Returns a detailed breakdown object, or null if required data is missing.
 */
export function computeRailingTakeoff({ catalogItem, materials, settings, length, isResidential, category }) {
  if (!catalogItem || !materials || !settings) return null;
  const layout = computeLayout({ catalogItem, settings, length, isResidential, category });
  if (!layout) return null;

  const componentResults = (catalogItem.components || []).map(c =>
    costComponent(c, materials.find(m => m.id === c.material_id), layout, length)
  );

  // If any component failed to resolve, return null (fallback to manual)
  if (componentResults.some(c => c === null)) return null;

  const materialCost = componentResults.reduce((s, c) => s + c.cost, 0);

  // Step 8: Labor costs (per linear foot — cost fields are hours/$ per ft)
  const fabCost = (catalogItem.cost_fab_hours_per_unit || 0) * (settings.labor_fab_rate || 0) * length;
  const powderCost = (catalogItem.cost_powder_coat_per_unit || 0) * length;
  const installCost = (catalogItem.cost_install_crew_size || 0) * (catalogItem.cost_install_hours_per_unit || 0) * (settings.labor_install_rate || 0) * length;

  const hardCost = materialCost + fabCost + powderCost + installCost;
  const totalPrice = hardCost * (catalogItem.cost_markup_multiplier || 1);

  return {
    inputs: { length, isResidential },
    params: layout.params,
    steps: layout.steps,
    components: componentResults,
    materialCost,
    fabCost,
    powderCost,
    installCost,
    hardCost,
    markupMultiplier: catalogItem.cost_markup_multiplier || 1,
    totalPrice,
  };
}