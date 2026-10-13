import { computeLayout, costComponent, resolveSettings } from "@/lib/railingTakeoff";

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

function computeCost(line, ctx) {
  const item = ctx.items.find((i) => i.id === line.service_catalog_id);
  if (!item || !ctx.settings) return null;
  const category = ctx.categories.find((c) => c.id === item.category_id);
  const railing = !!(category?.is_railing || item.is_railing);
  const qty = num(line.quantity);
  const isResidential = line.building_type !== "Commercial";
  const s = ctx.settings;
  const layout = railing ? computeLayout({ catalogItem: item, settings: resolveSettings([s]), length: qty, isResidential, category }) : null;
  const comps = (item.components || []).map((c) => costComponent(c, ctx.materials.find((m) => m.id === c.material_id), layout, qty)).filter(Boolean);
  const materials = comps.reduce((a, c) => a + c.cost, 0);
  const instHrs = num(item.cost_install_hours_per_unit) * qty;
  const breakdown = {
    materials: r2(materials),
    fabrication: r2(num(item.cost_fab_hours_per_unit) * qty * num(s.labor_fab_rate)),
    powder_coat: r2(num(item.cost_powder_coat_per_unit) * qty),
    install: r2(instHrs * num(item.cost_install_crew_size) * num(s.labor_install_rate)),
  };
  return {
    hard: r2(breakdown.materials + breakdown.fabrication + breakdown.powder_coat + breakdown.install),
    breakdown, instHrs, railing, layout,
    warn: railing && !layout ? "Missing railing standards or layout defaults" : comps.length < (item.components || []).length ? "A component is missing its material or cost" : null,
    components: comps.map((c) => ({ component_type: c.slot, name: c.material_name, slot: c.slot, material: c.material_name, qty: c.qty, qty_unit: c.qty_unit, unit_cost: c.unit_cost, cost: r2(c.cost) })),
  };
}

// Prices one line. Frozen (sent) cost lines keep their stored snapshot.
export function priceLine(line, ctx, estMargin, frozen) {
  const kind = lineKind(line);
  if (kind === "fixed") return { ...line, total: r2(num(line.quantity) * num(line.unit_cost)) };
  if (kind === "legacy") return { ...line, total: line.total ?? r2(num(line.quantity) * num(line.unit_cost)) };
  if (kind !== "cost") return line;

  const qty = num(line.quantity);
  let next = line;
  if (!(frozen && line.hard_cost != null)) {
    const c = computeCost(line, ctx);
    if (c) {
      next = {
        ...line, hard_cost: c.hard, cost_breakdown: c.breakdown, install_hours: r2(c.instHrs), components: c.components, _is_railing: c.railing,
        _railing_takeoff: c.layout ? { inputs: { length: qty, isResidential: line.building_type !== "Commercial" }, steps: c.layout.steps, params: c.layout.params } : null,
        _warn: c.warn,
      };
    }
  }
  const m = hasMargin(line.margin_pct) ? line.margin_pct : estMargin;
  const total = r2(priceFromHard(num(next.hard_cost), m));
  return { ...next, total, unit_cost: qty > 0 ? total / qty : 0 };
}

export function calcFuel({ lines, miles, extra, fuelMargin, targetMargin, price, mpg, hoursPerDay }) {
  const hrs = lines.reduce((a, l) => a + (lineKind(l) === "cost" ? num(l.install_hours) : 0), 0);
  const days = hrs > 0 && hoursPerDay > 0 ? Math.ceil(hrs / hoursPerDay) : 0;
  const trips = num(miles) > 0 ? days + num(extra) : 0;
  const gallons = num(mpg) > 0 ? (num(miles) * 2 * trips) / num(mpg) : 0;
  const cost = r2(gallons * num(price));
  return { days, trips, gallons, cost, price: fuelMargin ? r2(priceFromHard(cost, targetMargin)) : cost };
}

export function fuelLine(f, miles, extra) {
  if (!(num(miles) > 0)) return null;
  return {
    _is_fuel: true, is_fixed_price: true, service_name: "Fuel & travel", description: "Fuel and travel to job site",
    install_location: "N/A", quantity: f.trips, unit: "trips", unit_cost: f.trips > 0 ? f.price / f.trips : f.price, total: f.price, extra_trips: num(extra),
  };
}