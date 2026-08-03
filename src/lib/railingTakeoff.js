/**
 * Railing takeoff calculation utilities.
 * Reads from Service Catalog item parameters, StyleComponentMap, MaterialPriceList,
 * and org-level AppSettings to compute hard cost and final price.
 */

/**
 * Resolve effective $/lb for a material.
 * Priority: 1. auto (cost_per_stick / weight_per_stick), 2. override, 3. org steel price.
 */
export function resolveEffectivePerLb(material, orgSteelPrice) {
  if (material.cost_per_stick > 0 && material.weight_per_stick > 0) {
    return { value: material.cost_per_stick / material.weight_per_stick, mode: "auto" };
  }
  if (material.price_per_lb_override > 0) {
    return { value: material.price_per_lb_override, mode: "override" };
  }
  if (orgSteelPrice > 0) {
    return { value: orgSteelPrice, mode: "org" };
  }
  return { value: null, mode: null };
}

/**
 * Resolve weight_per_ft for a material.
 * Priority: 1. stored weight_per_ft, 2. derived (weight_per_stick / stock_length_ft).
 */
export function resolveWeightPerFt(material) {
  if (material.weight_per_ft > 0) return material.weight_per_ft;
  if (material.weight_per_stick > 0 && material.stock_length_ft > 0) {
    return material.weight_per_stick / material.stock_length_ft;
  }
  return null;
}

/**
 * Merge multiple AppSettings records into a single settings object.
 * For each field, takes the first record where the value is > 0.
 */
export function resolveSettings(records) {
  if (!records || records.length === 0) return null;
  const findVal = (field) => {
    for (const r of records) {
      if (r[field] != null && r[field] > 0) return r[field];
    }
    return 0;
  };
  return {
    steel_price_per_lb: findVal("steel_price_per_lb"),
    res_post_height_in: findVal("res_post_height_in"),
    res_picket_length_in: findVal("res_picket_length_in"),
    comm_post_height_in: findVal("comm_post_height_in"),
    comm_picket_length_in: findVal("comm_picket_length_in"),
    labor_fab_rate: findVal("labor_fab_rate"),
    labor_install_rate: findVal("labor_install_rate"),
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

    const wpf = resolveWeightPerFt(mat);
    const effLb = resolveEffectivePerLb(mat, settings.steel_price_per_lb);
    if (!wpf || !effLb.value) return null;

    const label = (c.component_label || "").toLowerCase();
    let feet = 0;
    if (label.includes("rail")) feet = railFeetPerComponent;
    else if (label.includes("post")) feet = postFeet;
    else if (label.includes("picket")) feet = picketFeet;

    const pounds = feet * wpf;
    const cost = pounds * effLb.value;

    return {
      component_label: c.component_label,
      material_name: mat.name,
      feet,
      weight_per_ft: wpf,
      pounds,
      effective_per_lb: effLb.value,
      effective_per_lb_mode: effLb.mode,
      cost,
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