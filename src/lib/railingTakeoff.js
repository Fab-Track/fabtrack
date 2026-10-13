/**
 * Railing takeoff calculation utilities.
 * Reads from Service Catalog item parameters, StyleComponentMap, MaterialPriceList,
 * and org-level AppSettings to compute hard cost and final price.
 */

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
 * Find the StyleComponentMap for a catalog item.
 * Tries service_catalog_id first, falls back to derived style_name.
 */
export function findComponentMap(maps, catalogItem) {
  if (!maps || !catalogItem) return null;
  const byCatalogId = maps.find(m => m.service_catalog_id === catalogItem.id);
  if (byCatalogId) return byCatalogId;
  const derivedStyleName = catalogItem.name?.replace(/\s+railing$/i, "").trim();
  return maps.find(m => m.style_name === derivedStyleName) || null;
}

/**
 * Compute railing takeoff from catalog item, component map, materials, and settings.
 * Returns a detailed breakdown object, or null if required data is missing.
 */
export function computeRailingTakeoff({ catalogItem, componentMap, materials, settings, length, isResidential }) {
  if (!catalogItem || !componentMap || !materials || !settings || !length || length <= 0) return null;

  const { post_spacing_in, post_width_in, picket_clear_gap_in, picket_width_in, rail_runs } = catalogItem;
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

  // Step 5-6: Feet needed per component type
  const railFeetPerComponent = length; // each rail component gets one rail run = length
  const postFeet = posts * (postHeight / 12);
  const picketFeet = totalPickets * (picketLength / 12);

  // Step 7: Per component cost
  const componentResults = (componentMap.components || []).map(c => {
    const mat = materials.find(m => m.id === c.material_id);
    if (!mat) return null;

    const label = (c.component_label || "").toLowerCase();
    const isRail = label.includes("rail");
    const isPost = label.includes("post");
    const isPicket = label.includes("picket");

    // Unit items are costed per piece: cost_per_unit x count.
    if (mat.cost_method === "unit") {
      if (!(mat.cost_per_unit > 0)) return null;
      const qty = isPost ? posts : isPicket ? totalPickets : isRail ? 1 : 0;
      return {
        component_label: c.component_label,
        material_name: mat.name,
        qty,
        qty_unit: mat.unit || "unit",
        unit_cost: mat.cost_per_unit,
        cost: qty * mat.cost_per_unit,
      };
    }

    // Linear-foot and weight items are both costed from the calculated cost_per_foot.
    if (!(mat.cost_per_foot > 0)) return null;
    const feet = isRail ? railFeetPerComponent : isPost ? postFeet : isPicket ? picketFeet : 0;
    return {
      component_label: c.component_label,
      material_name: mat.name,
      qty: feet,
      qty_unit: "ft",
      unit_cost: mat.cost_per_foot,
      cost: feet * mat.cost_per_foot,
    };
  });

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
    steps: { postsForNet, netLength, posts, sectionLength, picketsPerSection, totalPickets, postHeight, picketLength },
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