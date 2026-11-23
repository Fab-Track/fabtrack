import { componentWarnings, resolveRailingParams } from "@/lib/railingTakeoff";

export const PICKET_ORIENTATIONS = ["Vertical", "Horizontal"];
export const INFILL_TYPES = ["Pickets", "Mesh", "Glass", "None"];
export const needsInfillItem = (item) => item?.infill_type === "Mesh" || item?.infill_type === "Glass";

export const rows = (r) => (Array.isArray(r) ? r : r?.items || []);

export const money = (n, d = 2) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;

export const OVERRIDE_FIELDS = [
  { key: "post_spacing_in", label: "Post spacing", short: "Spacing" },
  { key: "post_width_in", label: "Post width", short: "Post width" },
  { key: "picket_clear_gap_in", label: "Picket gap", short: "Gap" },
  { key: "picket_width_in", label: "Picket width", short: "Picket width" },
  { key: "picket_height_in", label: "Picket height", short: "Picket height" },
  { key: "rail_runs", label: "Rail runs", short: "Rail runs" },
];

export const hasCostModel = (i) => (i.cost_fab_hours_per_unit || 0) > 0 || (i.cost_install_hours_per_unit || 0) > 0;
export const isPerJob = (i) => (i.name || "").trim().toLowerCase() === "custom";

/**
 * What a railing style still needs before it can be quoted. Empty array = ready.
 * Every slot the style actually uses must have a cost item, orientation and infill
 * type must be chosen, and fabrication, install and powder coat must be above zero.
 */
export function railingMissing(item, cat) {
  const miss = [];
  const comps = item.components || [];
  const { rail_runs } = resolveRailingParams(item, cat);
  const infill = item.infill_type || "Pickets";

  const slots = ["Top Rail", "Post"];
  if (Number(rail_runs) > 1) slots.push("Bottom Rail");
  if (infill === "Pickets") slots.push("Picket");
  slots.forEach((slot) => {
    const lines = comps.filter((c) => c.slot === slot);
    if (!lines.some((c) => c.material_id)) miss.push(`${slot} cost item`);
    else if (lines.length > 1) miss.push(`More than one ${slot} line`);
  });

  if (!item.picket_orientation) miss.push("Picket orientation");
  if (!item.infill_type) miss.push("Infill type");
  if (needsInfillItem(item) && !item.infill_material_id) miss.push("Infill cost item");
  if (!((item.cost_fab_hours_per_unit || 0) > 0)) miss.push("Fabrication hours");
  if (!((item.cost_install_hours_per_unit || 0) > 0)) miss.push("Install hours");
  if (!((item.cost_install_crew_size || 0) > 0)) miss.push("Crew size");
  if (!((item.cost_powder_coat_per_unit || 0) > 0)) miss.push("Powder coat $/LF");
  return miss;
}

export function isReady(item, cat) {
  if (cat?.is_fixed_price) return true;
  if (!(item.components || []).length || !hasCostModel(item)) return false;
  if (cat?.is_railing) return railingMissing(item, cat).length === 0;
  return true;
}

export function componentsState(item, cat) {
  const n = (item.components || []).length;
  if (!n) return { label: "Not mapped", tone: "muted" };
  if (cat?.is_railing && componentWarnings(item.components, null).length) return { label: `${n} mapped — check`, tone: "danger" };
  return { label: `${n} mapped`, tone: "info" };
}

export function statusOf(item, cat) {
  if (cat?.is_fixed_price) return { label: "Ready", tone: "info" };
  if (isPerJob(item)) return { label: "Quote per job", tone: "muted" };
  if (!(item.components || []).length) return { label: "Needs components", tone: "warn" };
  if (cat?.is_railing) {
    const missing = railingMissing(item, cat);
    return missing.length ? { label: "Fix components", tone: "danger", missing } : { label: "Ready", tone: "info" };
  }
  if (!hasCostModel(item)) return { label: "Needs cost model", tone: "warn" };
  return { label: "Ready", tone: "info" };
}

export function overridesOf(item, cat) {
  return OVERRIDE_FIELDS.filter((f) => item[f.key] != null && item[f.key] !== cat?.[f.key]).map((f) => ({
    ...f,
    value: item[f.key],
  }));
}

export const isGenericQbo = (name) => ["uncategorized", "railing"].includes((name || "").trim().toLowerCase());

export function unitLabel(cat) {
  if (!cat) return "unit";
  if (cat.is_fixed_price) return "unit";
  const u = (cat.pricing_unit || "").replace(/^per\s+/i, "").split(/\s*[·,]\s*/)[0].trim();
  return u || "unit";
}

export const unitChip = (cat) => cat?.pricing_unit || (cat?.is_fixed_price ? "fixed price" : "");