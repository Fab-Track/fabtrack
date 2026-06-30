/**
 * Default option lists for the Job Details tab.
 * These are seeded into JobDetailConfig when a new org is created,
 * and used as fallbacks when no org-specific config exists yet.
 */
export const JOB_DETAIL_DEFAULTS = {
  products: [
    "Railing", "Grab Rails", "Staircase", "Spiral", "Structural",
    "Awning", "Planter Box", "Ladder", "Fireplace", "Wall Wrap",
    "Pergola", "Gate", "Dumpster Gate", "Chimney Cap", "Other",
  ],
  railing_styles: [
    "Columbia", "Clearwater", "Uptown", "Bremerton", "Kennewick",
    "Handford", "Longview", "Rainer", "Tacoma", "The Craftsman",
    "Cable", "Custom",
  ],
  powdercoat_colors: [
    "Matte Black", "Semi Gloss Black", "Matte White", "Gloss White",
    "Oil Rubbed Bronze", "Wrinkle Black", "Dark Bronze", "Black Brown",
    "Silk Grey", "Galvanized", "Other",
  ],
  stair_styles: [
    "Mono", "Spiral", "Double Stringer", "Double Mono",
    "Platform", "Bridge", "Other",
  ],
  stair_materials: [
    'Spiral Post 4.5" OD',
    'C-Channel 2"x10"',
    'C-Channel 1.5"x10"',
    'Rec Tube 2"x10"x3/16"',
    '6"x8" Rec Tube',
    "Other",
  ],
  stair_tread_materials: [
    "Galvanized Safety Treads", "Wood Steps", "Expanded Metal",
    "Metal Grating", '1/4" Flat Plate', "Metal Bent Pans", "Other",
  ],
  surfaces: [
    "Wood Floors", "Trex", "Waterproofed Deck", "Tile Floor",
    "Bricks", "Concrete", "Steel", "Asphalt", "Metal Siding", "Other",
  ],
};

/** Keys that drive conditional field logic — matched by exact string. */
export const CONDITIONAL_PRODUCT_KEYS = {
  RAILING: "Railing",
  STAIRCASE: "Staircase",
  OTHER: "Other",
  CUSTOM: "Custom",
};