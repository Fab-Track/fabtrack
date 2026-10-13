import { componentWarnings } from "@/lib/railingTakeoff";

export const rows = (r) => (Array.isArray(r) ? r : r?.items || []);

export const money = (n, d = 2) =>
  `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;

export const OVERRIDE_FIELDS = [
  { key: "post_spacing_in", label: "Post spacing", short: "Spacing" },
  { key: "post_width_in", label: "Post width", short: "Post width" },
  { key: "picket_clear_gap_in", label: "Picket gap", short: "Gap" },
  { key: "picket_width_in", label: "Picket width", short: "Picket width" },
  { key: "rail_runs", label: "Rail runs", short: "Rail runs" },
];

export const hasCostModel = (i) => (i.cost_fab_hours_per_unit || 0) > 0 || (i.cost_install_hours_per_unit || 0) > 0;
export const isPerJob = (i) => (i.name || "").trim().toLowerCase() === "custom";

export function isReady(item, cat) {
  if (cat?.is_fixed_price) return true;
  return (item.components || []).length > 0 && hasCostModel(item);
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
  if (cat?.is_railing && componentWarnings(item.components, null).length) return { label: "Fix components", tone: "danger" };
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