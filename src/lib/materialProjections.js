/**
 * Utility to compute projected material quantities from estimate line items.
 * Used by the Projected Materials section on estimates and the Job Materials section on job detail.
 */
import { STYLE_MATERIAL_CONFIGS } from "@/lib/railingData";

const WASTE_BUFFER = 1.1; // 10% waste

/**
 * Given an array of line items (with _is_railing, _railing_style, quantity, _is_staircase, _staircase_type fields),
 * returns an array of { material, qty, source } projections.
 * Groups by material name and sums quantities.
 */
export function projectMaterials(lineItems) {
  const raw = [];

  for (const line of lineItems) {
    // ── Railing projection ──────────────────────────────────────────────────
    if (line._is_railing && line._railing_style && line.quantity > 0) {
      const lnft = line.quantity;
      const style = line._railing_style;
      const config = STYLE_MATERIAL_CONFIGS[style];
      if (config) {
        const components = ["topRail", "bottomRail", "posts", "pickets"];
        for (const comp of components) {
          const c = config[comp];
          if (!c || !c.material) continue;
          const qty = lnft * c.qtyMultiplier * WASTE_BUFFER;
          raw.push({ material: c.material, qty, source: `${style} Railing (${lnft} lnft)` });
        }
      }
    }

    // ── Staircase projection ────────────────────────────────────────────────
    if (line._is_staircase && line.quantity > 0) {
      const qty = line.quantity;
      const type = line._staircase_type;
      const staircaseMats = getStaircaseMaterials(type, qty);
      for (const m of staircaseMats) {
        raw.push({ ...m, source: `Staircase (${qty} ${type === "spiral" ? "in elevation" : "treads"})` });
      }
    }
  }

  // Group by material name
  const grouped = {};
  for (const entry of raw) {
    if (!grouped[entry.material]) {
      grouped[entry.material] = { material: entry.material, qty: 0, sources: [] };
    }
    grouped[entry.material].qty += entry.qty;
    if (!grouped[entry.material].sources.includes(entry.source)) {
      grouped[entry.material].sources.push(entry.source);
    }
  }

  return Object.values(grouped).map(g => ({
    material: g.material,
    qty: Math.round(g.qty * 10) / 10,
    sources: g.sources,
  }));
}

/**
 * Per-tread material estimate for tread-based staircases.
 * Per-inch-elevation estimate for spiral.
 */
function getStaircaseMaterials(type, qty) {
  if (type === "spiral") {
    // Spiral: per inch of elevation
    return [
      { material: 'SQUARE TUBE 2" × 2" × 0.078"', qty: Math.round(qty * 0.15 * WASTE_BUFFER * 10) / 10 },
      { material: 'FLATBAR 1/4" × 2"', qty: Math.round(qty * 0.1 * WASTE_BUFFER * 10) / 10 },
    ];
  }
  // Mono / Double Stringer: per tread
  return [
    { material: 'RECTANGLE TUBE 3" × 2" × 0.120"', qty: Math.round(qty * 3 * WASTE_BUFFER * 10) / 10 },
    { material: 'SQUARE TUBE 2" × 2" × 0.078"', qty: Math.round(qty * 2 * WASTE_BUFFER * 10) / 10 },
    { material: 'STAIR TREAD PLATE 1/4"', qty: Math.round(qty * 3.5 * WASTE_BUFFER * 10) / 10 },
    { material: 'FLATBAR 1/4" × 1-1/2"', qty: Math.round(qty * 1.5 * WASTE_BUFFER * 10) / 10 },
  ];
}

/**
 * Match projected material names to inventory items by name substring matching.
 * Returns { inventoryItem | null, status: 'sufficient' | 'short' | 'untracked' }
 */
export function matchProjectionToInventory(materialName, projectedQty, inventoryItems, reservations = []) {
  // Try to find a matching inventory item by name similarity
  const lower = materialName.toLowerCase();
  const match = inventoryItems.find(item => {
    const iLower = item.name.toLowerCase();
    return iLower.includes(lower) || lower.includes(iLower);
  });

  if (!match) {
    return { inventoryItem: null, status: "untracked", available: null };
  }

  const reserved = reservations
    .filter(r => r.inventory_item_id === match.id)
    .reduce((s, r) => s + (r.quantity || 0), 0);

  const available = (match.quantity_on_hand || 0) - reserved;
  const status = available >= projectedQty ? "sufficient" : "short";

  return { inventoryItem: match, status, available, reserved };
}