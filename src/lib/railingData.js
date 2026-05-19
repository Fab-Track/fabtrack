// ── Railing styles list ─────────────────────────────────────────────────────
export const RAILING_STYLES = [
  "Columbia",
  "Clearwater",
  "Uptown",
  "Toppenish",
  "Hanford",
  "Rainier",
  "Bremerton Interior",
  "Bremerton Exterior",
  "Richland",
  "Stephanie",
  "Kaizen",
  "Custom",
];

// ── Option 2: Per-lnft pricing tiers ───────────────────────────────────────
export function getBasePricePerFoot(lnft) {
  if (lnft <= 15) return 180;
  if (lnft <= 20) return 150;
  if (lnft <= 30) return 130;
  if (lnft <= 50) return 120;
  return 100;
}

// Style adders (per lnft) for Option 2
export const STYLE_ADDERS = {
  Columbia: 5,
  Clearwater: 5,
  Uptown: 10,
  Toppenish: 10,
  Hanford: 10,
  Rainier: 20,
  "Bremerton Interior": 25,
  "Bremerton Exterior": 25,
  Richland: 15,
  Stephanie: 15,
  Kaizen: 15,
  Custom: null, // manual entry
};

// ── Location fees ───────────────────────────────────────────────────────────
export const LOCATION_FEES = {
  "Utah County": 0,
  "Salt Lake County": 200,
  "Wasatch County": 300,
};

// ── Wood topper adders (per lnft) ───────────────────────────────────────────
export const WOOD_TOPPERS = {
  None: 0,
  "Red Oak": 35,
  "White Oak": 45,
};

// ── Glass adders (per lnft) ─────────────────────────────────────────────────
export const GLASS_OPTIONS = {
  None: 0,
  'Clear 3/8"': 75,
  'Clear 1/2"': 105,
  'Starfire 3/8"': 90,
  'Starfire 1/2"': 120,
};

// ── Steel type adders (per lnft) ────────────────────────────────────────────
export const STEEL_TYPES = {
  "Mild Steel": 0,
  "Stainless Steel": 50,
};

// ── Option 1: Style material configs ───────────────────────────────────────
// Each component: { material, costPerFoot, qtyMultiplier }
// qtyMultiplier is relative to lnft (posts = 0.75 × lnft, pickets = N × lnft, etc.)
// fabLaborHrs and installLaborHrs are per lnft
export const STYLE_MATERIAL_CONFIGS = {
  Columbia: {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    posts:      { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 0.75 },
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 7.0, orientation: 'Horizontal' },
    fabLaborHrs: 0.3,
    installLaborHrs: 0.05,
  },
  Clearwater: {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    posts:      { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 0.75 },
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 8.4, orientation: 'Vertical' },
    fabLaborHrs: 0.35,
    installLaborHrs: 0.05,
  },
  Uptown: {
    topRail:    { material: 'RECTANGLE TUBE 1-1/2" × 1" × 0.075"', costPerFoot: 2.1163, qtyMultiplier: 1.0 },
    bottomRail: { material: 'RECTANGLE TUBE 1-1/2" × 1" × 0.075"', costPerFoot: 2.1163, qtyMultiplier: 1.0 },
    posts:      { material: 'SQUARE TUBE 2" × 2" × 0.078"', costPerFoot: 2.5163, qtyMultiplier: 0.75 },
    pickets:    { material: 'FLATBAR 1/2" × 2"', costPerFoot: 3.0795, qtyMultiplier: 7.0, orientation: 'Horizontal' },
    fabLaborHrs: 0.35,
    installLaborHrs: 0.05,
  },
  Toppenish: {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    posts:      { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 0.75 },
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 7.0, orientation: 'Vertical' },
    fabLaborHrs: 0.45,
    installLaborHrs: 0.05,
  },
  Hanford: {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    posts:      null,
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 8.4, orientation: 'Vertical' },
    fabLaborHrs: 0.45,
    installLaborHrs: 0.05,
  },
  Rainier: {
    topRail:    { material: 'RECTANGLE TUBE 2" × 1"', costPerFoot: 2.50, qtyMultiplier: 1.0 },
    bottomRail: null,
    posts:      { material: 'FLATBAR 1/4" × 1-1/2"', costPerFoot: 1.1425, qtyMultiplier: 1.5 },
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 8.0, orientation: 'Horizontal' },
    fabLaborHrs: 0.45,
    installLaborHrs: 0.05,
  },
  "Bremerton Interior": {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    posts:      null,
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 7.0, orientation: 'Horizontal' },
    fabLaborHrs: 0.45,
    installLaborHrs: 0.05,
  },
  "Bremerton Exterior": {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    posts:      null,
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 7.0, orientation: 'Horizontal' },
    fabLaborHrs: 0.45,
    installLaborHrs: 0.05,
  },
  Richland: {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    posts:      { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 0.75 },
    pickets:    null,
    fabLaborHrs: 0.45,
    installLaborHrs: 0.05,
  },
  Stephanie: {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 2.0 },
    posts:      { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 0.75 },
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 7.0, orientation: 'Horizontal' },
    fabLaborHrs: 0.45,
    installLaborHrs: 0.05,
  },
  Kaizen: {
    topRail:    { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 1.0 },
    bottomRail: { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 3.0 },
    posts:      { material: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, qtyMultiplier: 0.75 },
    pickets:    { material: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, qtyMultiplier: 8.4, orientation: 'Vertical' },
    fabLaborHrs: 0.45,
    installLaborHrs: 0.05,
  },
  Custom: {
    topRail:    { material: '', costPerFoot: 0, qtyMultiplier: 1.0 },
    bottomRail: { material: '', costPerFoot: 0, qtyMultiplier: 1.0 },
    posts:      { material: '', costPerFoot: 0, qtyMultiplier: 0.75 },
    pickets:    { material: '', costPerFoot: 0, qtyMultiplier: 7.0, orientation: '' },
    fabLaborHrs: 0,
    installLaborHrs: 0.05,
  },
};

// ── Default materials for price library ─────────────────────────────────────
export const DEFAULT_MATERIALS = [
  // Square Tubes
  { name: 'SQUARE TUBE 1/2" × 1/2" × 0.065"', costPerFoot: 0.4913, category: 'Square Tube' },
  { name: 'SQUARE TUBE 3/4" × 3/4" × 0.065"', costPerFoot: 0.7569, category: 'Square Tube' },
  { name: 'SQUARE TUBE 1" × 1" × 0.065"', costPerFoot: 1.0225, category: 'Square Tube' },
  { name: 'SQUARE TUBE 1-1/2" × 1-1/2" × 0.078"', costPerFoot: 1.7729, category: 'Square Tube' },
  { name: 'SQUARE TUBE 2" × 2" × 0.078"', costPerFoot: 2.5163, category: 'Square Tube' },
  { name: 'SQUARE TUBE 2" × 2" × 0.120"', costPerFoot: 3.6180, category: 'Square Tube' },
  { name: 'SQUARE TUBE 2-1/2" × 2-1/2" × 0.120"', costPerFoot: 4.5225, category: 'Square Tube' },
  { name: 'SQUARE TUBE 3" × 3" × 0.120"', costPerFoot: 5.4270, category: 'Square Tube' },
  // Rectangle Tubes
  { name: 'RECTANGLE TUBE 1" × 1/2" × 0.065"', costPerFoot: 0.7390, category: 'Rectangle Tube' },
  { name: 'RECTANGLE TUBE 1-1/2" × 1" × 0.075"', costPerFoot: 2.1163, category: 'Rectangle Tube' },
  { name: 'RECTANGLE TUBE 2" × 1"', costPerFoot: 2.50, category: 'Rectangle Tube' },
  { name: 'RECTANGLE TUBE 2" × 1" × 0.083"', costPerFoot: 2.6838, category: 'Rectangle Tube' },
  { name: 'RECTANGLE TUBE 3" × 2" × 0.120"', costPerFoot: 4.7813, category: 'Rectangle Tube' },
  // Flat Bars
  { name: 'FLATBAR 1/4" × 1-1/2"', costPerFoot: 1.1425, category: 'Flat Bar' },
  { name: 'FLATBAR 1/4" × 2"', costPerFoot: 1.5233, category: 'Flat Bar' },
  { name: 'FLATBAR 3/8" × 2"', costPerFoot: 2.2849, category: 'Flat Bar' },
  { name: 'FLATBAR 1/2" × 2"', costPerFoot: 3.0795, category: 'Flat Bar' },
  { name: 'FLATBAR 1/2" × 3"', costPerFoot: 4.6193, category: 'Flat Bar' },
  { name: 'FLATBAR 3/4" × 3"', costPerFoot: 6.9289, category: 'Flat Bar' },
  // HR Channels
  { name: 'HR CHANNEL 3"', costPerFoot: 4.2500, category: 'HR Channel' },
  { name: 'HR CHANNEL 4"', costPerFoot: 5.6000, category: 'HR Channel' },
  // Angles
  { name: 'ANGLE 1" × 1" × 1/8"', costPerFoot: 0.8500, category: 'Angle' },
  { name: 'ANGLE 1-1/2" × 1-1/2" × 1/8"', costPerFoot: 1.2750, category: 'Angle' },
  { name: 'ANGLE 2" × 2" × 1/8"', costPerFoot: 1.7000, category: 'Angle' },
  { name: 'ANGLE 2" × 2" × 3/16"', costPerFoot: 2.5500, category: 'Angle' },
  // Stair materials
  { name: 'STAIR TREAD PLATE 1/4"', costPerFoot: 8.5000, category: 'Stair' },
  { name: 'STAIR GRATING 1"', costPerFoot: 12.0000, category: 'Stair' },
  { name: 'ROUND BAR 1/2"', costPerFoot: 0.6650, category: 'Round Bar' },
  { name: 'ROUND BAR 3/4"', costPerFoot: 1.4963, category: 'Round Bar' },
];