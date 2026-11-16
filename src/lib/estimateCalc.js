import { computeRailingCosts } from "@/lib/railingTakeoff";

export const num = (v) => parseFloat(v) || 0;
export const r2 = (n) => Math.round((n || 0) * 100) / 100;

// fuel = generated line; fixed = typed price; cost = priced from the catalog cost model; legacy = pre-existing manual line
export function lineKind(l) {
  if (l._is_fuel) return "fuel";
  if (l.is_fixed_price) return "fixed";
  if (l.service_catalog_id) return "cost";
  return "legacy";
}

export const hasMargin = (v) => v !== null && v !== undefined && v !== "";

export function priceFromHard(hard, marginPct) {
  const m = num(marginPct);
  return m < 100 ? hard / (1 - m / 100) : 0;
}

// Margin → price for one cost component. A margin of 100% or more cannot be divided
// into, so the component simply stands at cost instead of blowing up.
export function componentPrice(cost, marginPct) {
  const m = num(marginPct);
  return m < 100 ? num(cost) / (1 - m / 100) : num(cost);
}

// Each component's effective margin: its own override, else the line margin, else the target.
export function componentMargins(line, estMargin) {
  const m = hasMargin(line.margin_pct) ? num(line.margin_pct) : num(estMargin);
  const pick = (v) => (hasMargin(v) ? num(v) : m);
  return {
    materials: pick(line.material_margin_pct),
    powder_coat: pick(line.powder_coat_margin_pct),
    fabrication: pick(line.fab_margin_pct),
    install: pick(line.install_margin_pct),
  };
}

export const componentPrices = (bd, margins) => ({
  materials: componentPrice(bd?.materials, margins.materials),
  powder_coat: componentPrice(bd?.powder_coat, margins.powder_coat),
  fabrication: componentPrice(bd?.fabrication, margins.fabrication),
  install: componentPrice(bd?.install, margins.install),
});

// What the catalog suggests for this line, ignoring every override — the Reset target.
export function catalogCost(line, ctx) {
  const c = computeCost(line, ctx);
  return c ? { hard: c.hard, breakdown: c.breakdown, fabHrs: r2(c.fabHrs), instHrs: r2(c.instHrs), crew: c.crew } : null;
}

function computeCost(line, ctx) {
  const item = ctx.items.find((i) => i.id === line.service_catalog_id);
  if (!item || !ctx.settings) return null;
  const category = ctx.categories.find((c) => c.id === item.category_id);
  const qty = num(line.quantity);
  const isResidential = line.building_type !== "Commercial";
  // One engine: same style + LF + org standards => same takeoff and same four costs.
  const calc = computeRailingCosts({ catalogItem: item, category, settings: ctx.settings, materials: ctx.materials, length: qty, isResidential });
  return {
    hard: calc.hardCost,
    breakdown: calc.costs,
    instHrs: calc.hours.install,
    fabHrs: calc.hours.fabrication,
    crew: num(item.cost_install_crew_size),
    railing: calc.isRailing,
    layout: calc.layout,
    warn: calc.warn,
    components: calc.components.map((c) => ({ component_type: c.slot, name: c.material_name, slot: c.slot, material: c.material_name, material_id: c.material_id, qty: c.qty, qty_unit: c.qty_unit, unit_cost: c.unit_cost, cost: r2(c.cost) })),
    aggregatedMaterials: calc.materialLines,
  };
}

// Prices one line. Frozen (sent) cost lines keep their stored snapshot.
// hours_override holds labor hours typed on the line; the rates always come from Settings.
export function priceLine(line, ctx, estMargin, frozen) {
  const kind = lineKind(line);
  if (kind === "fixed") return { ...line, total: r2(num(line.quantity) * num(line.unit_cost)) };
  if (kind === "legacy") return { ...line, total: line.total ?? r2(num(line.quantity) * num(line.unit_cost)) };
  if (kind !== "cost") return line;

  const qty = num(line.quantity);
  const ov = line.hours_override || {};
  let next = line;
  // If cost overrides are locked and the quantity hasn't changed, keep the stored costs.
  // The lock rides on the saved takeoff snapshot, since a bare _takeoff_locked key is not
  // a stored field and would be dropped the moment the estimate is saved.
  const takeoffLocked = (line._takeoff_locked || line._railing_takeoff?.overridden) && line._railing_takeoff?.inputs?.length === qty;
  if (!(frozen && line.hard_cost != null) && !takeoffLocked) {
    const c = computeCost(line, ctx);
    if (c) {
      next = {
        ...line, hard_cost: c.hard, cost_breakdown: c.breakdown, install_hours: r2(c.instHrs),
        _fab_hours_base: r2(c.fabHrs), _install_hours_base: r2(c.instHrs), components: c.components, _is_railing: c.railing,
        _railing_takeoff: c.layout ? { inputs: { length: qty, isResidential: line.building_type !== "Commercial" }, steps: c.layout.steps, params: c.layout.params, aggregatedMaterials: c.aggregatedMaterials } : null,
        _warn: c.warn,
      };
    }
  }

  // Estimator-edited hours / crew replace the catalog estimate, priced at the Settings rates.
  if (!frozen && (ov.fabrication != null || ov.install != null || ov.crew != null)) {
    const bd = next.cost_breakdown || {};
    const fabRate = num(ctx.settings?.labor_fab_rate);
    const installRate = num(ctx.settings?.labor_install_rate);
    const catalogCrew = num(ctx.items.find((i) => i.id === line.service_catalog_id)?.cost_install_crew_size);
    // Crew typed on the line wins; the catalog crew is the default.
    const crew = ov.crew != null ? num(ov.crew) : catalogCrew;
    // Base hours: freshly computed, or read back from the stored breakdown (takeoff-locked line).
    const baseFab = next._fab_hours_base != null ? next._fab_hours_base : fabRate > 0 ? num(bd.fabrication) / fabRate : 0;
    const baseInst = next._install_hours_base != null ? next._install_hours_base
      : catalogCrew > 0 && installRate > 0 ? num(bd.install) / (catalogCrew * installRate) : num(next.install_hours);
    const fabHrs = ov.fabrication != null ? num(ov.fabrication) : baseFab;
    const instHrs = ov.install != null ? num(ov.install) : baseInst;
    const parts = { ...bd, fabrication: r2(fabHrs * fabRate), install: r2(instHrs * crew * installRate) };
    next = {
      ...next, cost_breakdown: parts, install_hours: r2(instHrs),
      hard_cost: r2(num(parts.materials) + num(parts.fabrication) + num(parts.powder_coat) + num(parts.install)),
    };
  }

  // Every component carries its own margin; blank falls back to the line margin, then the target.
  // With all four equal this is exactly the whole-job price the estimate had before.
  const bdNext = next.cost_breakdown || {};
  const p = componentPrices(bdNext, componentMargins(line, estMargin));
  const total = r2(p.materials + p.powder_coat + p.fabrication + p.install);
  return { ...next, total, unit_cost: qty > 0 ? total / qty : 0 };
}

export function calcFuel({ lines, miles, extra, fuelMarginPct, price, mpg, hoursPerDay }) {
  const hrs = lines.reduce((a, l) => a + (lineKind(l) === "cost" ? num(l.install_hours) : 0), 0);
  const days = hrs > 0 && hoursPerDay > 0 ? Math.ceil(hrs / hoursPerDay) : 0;
  const trips = num(miles) > 0 ? days + num(extra) : 0;
  const gallons = num(mpg) > 0 ? (num(miles) * 2 * trips) / num(mpg) : 0;
  const cost = r2(gallons * num(price));
  return { days, trips, gallons, cost, price: r2(componentPrice(cost, fuelMarginPct)) };
}

export function fuelLine(f, miles, extra) {
  if (!(num(miles) > 0)) return null;
  return {
    _is_fuel: true, is_fixed_price: true, service_name: "Fuel & travel", description: "Fuel and travel to job site",
    install_location: "N/A", quantity: f.trips, unit: "trips", unit_cost: f.trips > 0 ? f.price / f.trips : f.price, total: f.price, extra_trips: num(extra),
  };
}