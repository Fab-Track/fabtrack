// Default service catalog items — seeded on first load in Settings
export const DEFAULT_SERVICE_CATALOG = [
  // ── RAILING ──────────────────────────────────────────────────────────────
  {
    name: "Columbia Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 185,
    is_railing: true,
    sort_order: 1,
    default_description: "Columbia style railing. Top rail: 1.5\"×1.5\" sq tube. Bottom rail: 1.5\"×1.5\" sq tube. Posts: 1.5\"×1.5\" sq tube. Pickets: 0.5\"×0.5\" sq tube. Horizontal orientation. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Clearwater Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 155,
    is_railing: true,
    sort_order: 2,
    default_description: "Clearwater style railing. Top rail: 1.5\"×1.5\" sq tube. Bottom rail: 1.5\"×1.5\" sq tube. Posts: 1.5\"×1.5\" sq tube. Pickets: 0.5\"×0.5\" sq tube. Vertical orientation. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Uptown Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 160,
    is_railing: true,
    sort_order: 3,
    default_description: "Uptown style railing. Top rail: 1.5\"×1\" rect tube. Bottom rail: 1.5\"×1\" rect tube. Posts: 2\"×2\" sq tube. Pickets: 0.5\"×2\" flat bar. Horizontal orientation. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Toppenish Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 160,
    is_railing: true,
    sort_order: 4,
    default_description: "Toppenish style railing. Top rail: 1.5\"×1.5\" sq tube. Bottom rail: 1.5\"×1.5\" sq tube. Posts: 0.5\"×0.5\" sq tube. Pickets: 0.5\"×0.5\" sq tube. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Hanford Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 160,
    is_railing: true,
    sort_order: 5,
    default_description: "Hanford style railing. Top rail: 1.5\"×1.5\" sq tube. Bottom rail: 1.5\"×1.5\" sq tube. Pickets: 0.5\"×0.5\" sq tube. Vertical orientation. No posts. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Rainier Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 170,
    is_railing: true,
    sort_order: 6,
    default_description: "Rainier style railing. Top rail: 2\"×1\" rect tube. Posts: 0.25\"×1.5\" flat bar. Pickets: 0.5\"×0.5\" sq tube. Horizontal orientation. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Bremerton Interior Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 200,
    is_railing: true,
    sort_order: 7,
    default_description: "Bremerton interior style railing. Top rail: 1.5\"×1.5\" sq tube. Bottom rail: 1.5\"×1.5\" sq tube. Pickets: 0.5\"×0.5\" sq tube. Horizontal orientation. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Bremerton Exterior Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 260,
    is_railing: true,
    sort_order: 8,
    default_description: "Bremerton exterior style railing. Top rail: 1.5\"×1.5\" sq tube. Bottom rail: 1.5\"×1.5\" sq tube. Pickets: 0.5\"×0.5\" sq tube. Horizontal orientation. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Richland Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 160,
    is_railing: true,
    sort_order: 9,
    default_description: "Richland style railing. Top rail: 1.5\"×1.5\" sq tube. Bottom rail: 1.5\"×1.5\" sq tube. Posts: 1.5\"×1.5\" sq tube. No pickets. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Stephanie Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 165,
    is_railing: true,
    sort_order: 10,
    default_description: "Stephanie style railing. Top rail: 1.5\"×1.5\" sq tube. Double bottom rail: 1.5\"×1.5\" sq tube. Posts: 1.5\"×1.5\" sq tube. Pickets: 0.5\"×0.5\" sq tube. Horizontal orientation. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Kaizen Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 165,
    is_railing: true,
    sort_order: 11,
    default_description: "Kaizen style railing. Top rail: 1.5\"×1.5\" sq tube. Triple bottom rail: 1.5\"×1.5\" sq tube. Posts: 1.5\"×1.5\" sq tube. Pickets: 0.5\"×0.5\" sq tube. Vertical orientation. Includes materials, fabrication, powder coat, and installation.",
  },
  {
    name: "Custom Railing",
    category: "Railing",
    unit: "lnft",
    default_unit_price: 0,
    is_railing: true,
    sort_order: 12,
    default_description: "Custom railing — pricing TBD based on design specifications. Includes materials, fabrication, powder coat, and installation.",
  },

  // ── STAIRCASE ────────────────────────────────────────────────────────────
  {
    name: "Mono Stringer Staircase",
    category: "Staircase",
    unit: "per tread",
    default_unit_price: 550,
    is_railing: false,
    sort_order: 20,
    default_description: "Mono stringer staircase with steel treads. Price is per tread/step. Includes stringer fabrication, steel treads, powder coat, and installation. Handrail/railing quoted separately. Note: Wood treads are not included — customer to arrange separate contractor for wood tread supply and installation.",
  },
  {
    name: "Double Stringer Staircase — Steel Treads",
    category: "Staircase",
    unit: "per tread",
    default_unit_price: 550,
    is_railing: false,
    sort_order: 21,
    default_description: "Double stringer staircase with steel treads. Price is per tread/step. Includes stringer fabrication, steel treads, powder coat, and installation. Handrail/railing quoted separately.",
  },
  {
    name: "Double Stringer Staircase — Concrete Treads",
    category: "Staircase",
    unit: "per tread",
    default_unit_price: 550,
    is_railing: false,
    sort_order: 22,
    default_description: "Double stringer staircase with concrete treads (concrete by others). Price is per tread/step. Includes stringer fabrication, powder coat, and installation. Handrail/railing quoted separately.",
  },
  {
    name: "Spiral Staircase",
    category: "Staircase",
    unit: "per inch elevation",
    default_unit_price: 105,
    is_railing: false,
    sort_order: 23,
    default_description: "Spiral staircase. Price is per inch of total elevation rise. Includes fabrication, powder coat, and installation. Handrail/railing quoted separately.",
  },
  {
    name: "Staircase Handrail / Railing",
    category: "Staircase",
    unit: "lnft",
    default_unit_price: 0,
    is_railing: false,
    sort_order: 24,
    default_description: "Handrail and railing for staircase. Priced separately — see railing line items for style and pricing.",
  },

  // ── GATES ────────────────────────────────────────────────────────────────
  {
    name: "Gate — Basic Design",
    category: "Gates",
    unit: "lnft",
    default_unit_price: 220,
    is_railing: false,
    sort_order: 30,
    default_description: "Basic design gate. Price is per linear foot of gate width. Includes fabrication, hardware, powder coat, and installation.",
  },
  {
    name: "Gate — Custom Design",
    category: "Gates",
    unit: "lnft",
    default_unit_price: 0,
    is_railing: false,
    sort_order: 31,
    default_description: "Custom design gate — pricing TBD based on complexity, size, and hardware requirements. Includes fabrication, hardware, powder coat, and installation.",
  },

  // ── OTHER ────────────────────────────────────────────────────────────────
  {
    name: "Planter Box",
    category: "Other",
    unit: "sqft",
    default_unit_price: 40,
    is_railing: false,
    sort_order: 40,
    default_description: "Steel planter box. Price is per square foot of surface material. Includes fabrication and powder coat. Delivery/installation quoted separately if needed.",
  },
  {
    name: "Pergola / Shade Structure",
    category: "Other",
    unit: "ls",
    default_unit_price: 0,
    is_railing: false,
    sort_order: 41,
    default_description: "Pergola or shade structure — pricing TBD based on size and design. Includes fabrication, powder coat, and installation.",
  },
  {
    name: "Structural — Beams & Columns",
    category: "Other",
    unit: "ls",
    default_unit_price: 0,
    is_railing: false,
    sort_order: 42,
    default_description: "Structural steel fabrication and installation — pricing TBD based on engineer drawings and member callouts.",
  },
  {
    name: "Chimney Cap",
    category: "Other",
    unit: "ea",
    default_unit_price: 0,
    is_railing: false,
    sort_order: 43,
    default_description: "Custom chimney cap — pricing TBD based on flue dimensions and design. Includes fabrication, powder coat, and installation.",
  },
  {
    name: "Powder Coat — Subcontractor",
    category: "Other",
    unit: "ls",
    default_unit_price: 0,
    is_railing: false,
    sort_order: 44,
    default_description: "Powder coat subcontractor cost. Internal cost item — do not show on customer estimate.",
  },
  {
    name: "Demo / Disposal",
    category: "Other",
    unit: "ls",
    default_unit_price: 0,
    is_railing: false,
    sort_order: 45,
    default_description: "Demolition and disposal of existing railing or structure.",
  },
  {
    name: "Travel Fee — Salt Lake County",
    category: "Other",
    unit: "ls",
    default_unit_price: 200,
    is_railing: false,
    sort_order: 46,
    default_description: "Travel surcharge for Salt Lake County jobs.",
  },
  {
    name: "Travel Fee — Wasatch County",
    category: "Other",
    unit: "ls",
    default_unit_price: 300,
    is_railing: false,
    sort_order: 47,
    default_description: "Travel surcharge for Wasatch County jobs.",
  },
  {
    name: "Miscellaneous",
    category: "Other",
    unit: "ls",
    default_unit_price: 0,
    is_railing: false,
    sort_order: 48,
    default_description: "Miscellaneous charges — describe in notes.",
  },
];

export const CATALOG_CATEGORIES = ["Railing", "Staircase", "Gates", "Other"];

/**
 * Volume discount tiers for railing items (lnft)
 * Returns the discount per lnft to subtract from base price
 */
export function getRailingVolumeDiscount(qty) {
  const q = parseFloat(qty) || 0;
  if (q >= 100) return 80;
  if (q >= 51) return 80;
  if (q >= 31) return 60;
  if (q >= 21) return 50;
  if (q >= 16) return 30;
  return 0; // 10-15 lnft: no discount
}

export function getRailingVolumeTierLabel(qty) {
  const q = parseFloat(qty) || 0;
  if (q >= 100) return "100+ lnft";
  if (q >= 51) return "51–100 lnft";
  if (q >= 31) return "31–50 lnft";
  if (q >= 21) return "21–30 lnft";
  if (q >= 16) return "16–20 lnft";
  return null;
}

/**
 * Suggest catalog item names based on product instances added to a job.
 * Returns { suggestedNames: string[], label: string }
 */
export function getSuggestionsForProducts(productInstances = [], jobType = "") {
  const suggestions = new Set();

  const types = [
    ...productInstances.map(p => (p.product_type || "").toLowerCase()),
    jobType.toLowerCase(),
  ];

  for (const t of types) {
    if (t === "railing") {
      // Suggest all railing styles — the caller can filter by selected style
      suggestions.add("__all_railing__");
    }
    if (t === "staircase" || t === "stair") {
      suggestions.add("Mono Stringer Staircase");
      suggestions.add("Double Stringer Staircase — Steel Treads");
      suggestions.add("Double Stringer Staircase — Concrete Treads");
      suggestions.add("Spiral Staircase");
      suggestions.add("Staircase Handrail / Railing");
    }
    if (t === "gate") {
      suggestions.add("Gate — Basic Design");
      suggestions.add("Gate — Custom Design");
    }
    if (t === "custom structure" || t === "structural") {
      suggestions.add("Structural — Beams & Columns");
    }
    if (t === "pergola") {
      suggestions.add("Pergola / Shade Structure");
    }
    if (t === "planter box" || t === "planter") {
      suggestions.add("Planter Box");
    }
    if (t === "chimney cap" || t === "chimney") {
      suggestions.add("Chimney Cap");
    }
  }

  return [...suggestions];
}