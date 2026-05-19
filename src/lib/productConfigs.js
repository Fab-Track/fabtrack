/**
 * Product type field configurations for Project Details.
 * Each field has:
 *   key, label, type ('select'|'text'|'number'|'textarea'|'checkbox'),
 *   options (for select), role ('designer'|'installer'|'both'),
 *   section (string label for grouping)
 *
 * Sections kept per product: Project Scope, Design Details, Beam Callouts,
 * Column Callouts, Finish, Install Details.
 *
 * Moved to job level: Site Access, Materials Checklist, Site Photos.
 * Removed entirely: Approval & Status (incl. Ready to Fabricate).
 */

export const PRODUCT_TYPES = [
  "Railing",
  "Staircase",
  "Gate",
  "Structural",
  "Pergola",
  "Planter Box",
  "Chimney Cap",
];

// ─── Shared finish presets ───────────────────────────────────────────────────

const STANDARD_FINISH_FIELDS = [
  { key: "powder_coat_color", label: "Powder Coat Color", type: "select", options: ["Matte Black","Gloss Black","Iron Ore","None"], role: "both" },
  { key: "ral_code", label: "RAL / Color Code", type: "text", role: "both" },
  { key: "powder_coat_shop", label: "Name of Powder Coat Shop", type: "select", options: ["Quality Powder Coat","High Country Powders","Other"], role: "both" },
  { key: "touchup_paint", label: "Touch-up Paint Needed on Site", type: "select", options: ["Yes","No"], role: "both" },
];

// ─── RAILING ────────────────────────────────────────────────────────────────
const RAILING_FIELDS = [
  // Project Scope
  { key: "location", label: "Location", type: "select", options: ["Interior","Exterior"], role: "both", section: "Project Scope" },
  { key: "code_type", label: "Code Type", type: "select", options: ["Residential","Commercial"], role: "both", section: "Project Scope" },
  { key: "interior_install_location", label: "Interior Install Location", type: "select", options: ["Main Floor","2nd Floor","Basement","Mother in Law Apartment","NA"], role: "both", section: "Project Scope" },
  { key: "exterior_install_location", label: "Exterior Install Location", type: "select", options: ["Front Porch","Back Deck","Front Balcony","Pool House","NA"], role: "both", section: "Project Scope" },
  // Design Details
  { key: "railing_style", label: "Railing Style", type: "select", options: ["Columbia","Clearwater","Custom"], role: "both", section: "Design Details" },
  { key: "top_rail_material", label: "Top Rail Material", type: "select", options: ['1.5"x1.5"','0.5"x0.5"','1.5" Round Tube',"Custom"], role: "both", section: "Design Details" },
  { key: "bottom_rail_material", label: "Bottom Rail Material", type: "select", options: ['1.5"x1.5"','0.5"x0.5"','1.5" Round Tube',"Custom"], role: "both", section: "Design Details" },
  { key: "pickets_material", label: "Pickets Material", type: "select", options: ['1.5"x1.5"','0.5"x0.5"','1.5" Round Tube',"Custom"], role: "both", section: "Design Details" },
  { key: "post_material", label: "Post Material", type: "select", options: ['1.5"x1.5"','0.5"x0.5"','1.5" Round Tube',"Custom"], role: "both", section: "Design Details" },
  { key: "pieces_of_railing", label: "Pieces of Railing for Job", type: "select", options: ["1","2","3","4","5","6","7","8","9","+"], role: "both", section: "Design Details" },
  { key: "special_design_notes", label: "Special Design Notes", type: "textarea", role: "both", section: "Design Details" },
  // Finish
  ...STANDARD_FINISH_FIELDS.map(f => ({ ...f, section: "Finish" })),
  // Install Details
  { key: "surface_material", label: "Surface Material Installing On", type: "select", options: ["Concrete","Wood","Tile","Pavers","Composite Deck","Stone","Steel","Other"], role: "installer", section: "Install Details" },
  { key: "backing_blocking", label: "Backing / Blocking In Place", type: "select", options: ["Yes","No","We Install It"], role: "installer", section: "Install Details" },
  { key: "backing_material", label: "Backing Material", type: "select", options: ["Wood","Steel","None","Unknown"], role: "installer", section: "Install Details" },
  { key: "anchor_type", label: "Anchor / Fastener Type", type: "select", options: ["Concrete Anchor","Lag Bolt","Through Bolt","Weld","Adhesive","TBD"], role: "installer", section: "Install Details" },
  { key: "drill_bit_notes", label: "Special Drill Bit Notes", type: "text", role: "installer", section: "Install Details" },
  { key: "estimated_install_time", label: "Estimated Install Time (hrs)", type: "number", role: "installer", section: "Install Details" },
  { key: "num_installers", label: "Number of Installers Needed", type: "number", role: "installer", section: "Install Details" },
  { key: "crane_required", label: "Crane or Telehandler Required", type: "select", options: ["Yes","No","Maybe","We can borrow one on-site"], role: "installer", section: "Install Details" },
];

// ─── STAIRCASE ──────────────────────────────────────────────────────────────
const STAIRCASE_FIELDS = [
  { key: "location", label: "Location", type: "select", options: ["Interior","Exterior"], role: "both", section: "Project Scope" },
  { key: "code_type", label: "Code Type", type: "select", options: ["Residential","Commercial"], role: "both", section: "Project Scope" },
  { key: "num_steps", label: "Number of Steps", type: "number", role: "both", section: "Project Scope" },
  { key: "overall_rise_height", label: "Overall Rise Height (inches)", type: "number", role: "designer", section: "Project Scope" },
  { key: "overall_run_depth", label: "Overall Run Depth (inches)", type: "number", role: "designer", section: "Project Scope" },
  // Design Details
  { key: "staircase_type", label: "Staircase Type", type: "select", options: ["Double Stringer","Mono Stringer","Spiral","Switchback","Floating Treads","Custom"], role: "designer", section: "Design Details" },
  { key: "stringer_material", label: "Stringer Material", type: "select", options: ["C-Channel","Tube","Plate","Custom"], role: "designer", section: "Design Details" },
  { key: "stringer_size", label: "Stringer Size", type: "text", role: "designer", section: "Design Details" },
  { key: "tread_material", label: "Tread Material", type: "select", options: ["Steel Grating","Diamond Plate","Expanded Metal","Wood (owner supplied)","Concrete (by others)","Custom"], role: "designer", section: "Design Details" },
  { key: "tread_size", label: "Tread Size (W x D)", type: "text", role: "designer", section: "Design Details" },
  { key: "riser_type", label: "Riser Type", type: "select", options: ["Open","Closed","Partial"], role: "designer", section: "Design Details" },
  { key: "handrail_side", label: "Handrail Side", type: "select", options: ["Left","Right","Both Sides","None"], role: "both", section: "Design Details" },
  { key: "handrail_style", label: "Handrail Style", type: "text", role: "both", section: "Design Details" },
  { key: "landing_included", label: "Landing Platform Included", type: "select", options: ["Yes","No"], role: "designer", section: "Design Details" },
  { key: "landing_size", label: "Landing Size (if applicable)", type: "text", role: "designer", section: "Design Details" },
  { key: "rotation_direction", label: "Rotation / Direction", type: "select", options: ["Straight","Left Turn","Right Turn","180 Turn","Custom"], role: "designer", section: "Design Details" },
  { key: "special_design_notes", label: "Special Design Notes", type: "textarea", role: "designer", section: "Design Details" },
  // Finish
  { key: "powder_coat_color", label: "Powder Coat Color", type: "text", role: "both", section: "Finish" },
  { key: "ral_code", label: "RAL / Color Code", type: "text", role: "both", section: "Finish" },
  { key: "finish_type", label: "Finish Type", type: "select", options: ["Powder Coat","Paint","Raw","Galvanized","Other"], role: "designer", section: "Finish" },
  // Install Details
  { key: "install_location_desc", label: "Specific Install Location Description", type: "textarea", role: "installer", section: "Install Details" },
  { key: "top_connection_type", label: "Top Connection Type", type: "select", options: ["Ledger Bolt","Weld","Surface Mount Plate","TBD"], role: "installer", section: "Install Details" },
  { key: "bottom_connection_type", label: "Bottom Connection Type", type: "select", options: ["Concrete Footer","Slab Anchor","Deck Mount","TBD"], role: "installer", section: "Install Details" },
  { key: "surface_at_base", label: "Surface Material at Base", type: "select", options: ["Concrete","Wood Deck","Pavers","Dirt","Other"], role: "installer", section: "Install Details" },
  { key: "backing_blocking", label: "Backing / Blocking In Place", type: "select", options: ["Yes","No","We Install It"], role: "installer", section: "Install Details" },
  { key: "estimated_install_time", label: "Estimated Install Time (hrs)", type: "number", role: "installer", section: "Install Details" },
  { key: "num_installers", label: "Number of Installers Needed", type: "number", role: "installer", section: "Install Details" },
  { key: "lift_scaffold", label: "Lift / Scaffold Required", type: "select", options: ["Yes","No","Maybe"], role: "installer", section: "Install Details" },
  { key: "concrete_pour", label: "Concrete Pour Required", type: "select", options: ["Yes","No","By Others"], role: "installer", section: "Install Details" },
];

// ─── GATE ────────────────────────────────────────────────────────────────────
const GATE_FIELDS = [
  { key: "gate_type", label: "Gate Type", type: "select", options: ["Single Leaf","Double Leaf","Bi-Fold","Sliding","Cantilever Slide"], role: "both", section: "Project Scope" },
  { key: "location", label: "Location", type: "select", options: ["Front Entry","Side Yard","Backyard","Driveway","Pool","Commercial Entry"], role: "both", section: "Project Scope" },
  { key: "code_type", label: "Code Type", type: "select", options: ["Residential","Commercial","Pool Code"], role: "both", section: "Project Scope" },
  { key: "opening_width", label: "Opening Width (inches)", type: "number", role: "both", section: "Project Scope" },
  { key: "gate_height", label: "Gate Height (inches)", type: "number", role: "both", section: "Project Scope" },
  // Design Details
  { key: "frame_material", label: "Frame Material", type: "select", options: ["Square Tube","Round Tube","Flat Bar","C-Channel","Custom"], role: "designer", section: "Design Details" },
  { key: "frame_tube_size", label: "Frame Tube Size", type: "text", role: "designer", section: "Design Details" },
  { key: "infill_material", label: "Infill Material", type: "select", options: ["Flat Bar","Round Bar","Square Bar","Cable","Metal Panel","Wood by others","Custom"], role: "designer", section: "Design Details" },
  { key: "infill_pattern", label: "Infill Size / Pattern", type: "text", role: "designer", section: "Design Details" },
  { key: "swing_direction", label: "Swing Direction", type: "select", options: ["Inswing","Outswing","N/A slide"], role: "both", section: "Design Details" },
  { key: "hinge_type", label: "Hinge Type", type: "select", options: ["Weld-on","Bolt-on","Adjustable","Heavy Duty","N/A"], role: "designer", section: "Design Details" },
  { key: "num_hinges", label: "Number of Hinges", type: "number", role: "designer", section: "Design Details" },
  { key: "latch_type", label: "Latch Type", type: "select", options: ["Thumb Latch","Cane Bolt","Drop Rod","Magnetic","Auto-Latch","Keyed Lock","Padlock Hasps","None"], role: "both", section: "Design Details" },
  { key: "automation_motor", label: "Automation / Motor", type: "select", options: ["Yes","No","Pre-wire only"], role: "both", section: "Design Details" },
  { key: "motor_brand", label: "Motor Brand / Model", type: "text", role: "both", section: "Design Details" },
  { key: "access_control", label: "Access Control", type: "select", options: ["Keypad","Intercom","Remote","Phone App","None"], role: "both", section: "Design Details" },
  { key: "self_closing", label: "Self-Closing Required", type: "select", options: ["Yes","No"], role: "designer", section: "Design Details" },
  { key: "drop_rod", label: "Drop Rod / Bottom Lock", type: "select", options: ["Yes","No"], role: "both", section: "Design Details" },
  { key: "special_design_notes", label: "Special Design Notes", type: "textarea", role: "designer", section: "Design Details" },
  // Finish
  { key: "powder_coat_color", label: "Powder Coat Color", type: "text", role: "both", section: "Finish" },
  { key: "ral_code", label: "RAL / Color Code", type: "text", role: "both", section: "Finish" },
  { key: "finish_type", label: "Finish Type", type: "select", options: ["Powder Coat","Paint","Raw","Galvanized","Other"], role: "designer", section: "Finish" },
  // Install Details
  { key: "install_location_desc", label: "Specific Install Location Description", type: "textarea", role: "installer", section: "Install Details" },
  { key: "post_setting_method", label: "Post Setting Method", type: "select", options: ["Set in Concrete","Surface Mount","Attach to Existing Column","TBD"], role: "installer", section: "Install Details" },
  { key: "existing_posts", label: "Existing Posts / Columns Present", type: "select", options: ["Yes","No","Partial"], role: "installer", section: "Install Details" },
  { key: "surface_at_base", label: "Surface Material at Base", type: "select", options: ["Concrete","Pavers","Asphalt","Dirt","Other"], role: "installer", section: "Install Details" },
  { key: "electrical_roughin", label: "Electrical Rough-In Present (for auto gates)", type: "select", options: ["Yes","No","By Others"], role: "installer", section: "Install Details" },
  { key: "estimated_install_time", label: "Estimated Install Time (hrs)", type: "number", role: "installer", section: "Install Details" },
  { key: "num_installers", label: "Number of Installers Needed", type: "number", role: "installer", section: "Install Details" },
  { key: "concrete_pour", label: "Concrete Pour Required", type: "select", options: ["Yes","No","By Others"], role: "installer", section: "Install Details" },
];

// ─── STRUCTURAL ──────────────────────────────────────────────────────────────
const STRUCTURAL_FIELDS = [
  { key: "project_type", label: "Project Type", type: "select", options: ["Beam","Column","Moment Frame","Canopy","Carport","Awning","Mixed"], role: "both", section: "Project Scope" },
  { key: "location", label: "Location", type: "select", options: ["Interior","Exterior","Both"], role: "both", section: "Project Scope" },
  { key: "code_type", label: "Code Type", type: "select", options: ["Residential","Commercial"], role: "both", section: "Project Scope" },
  { key: "engineer_drawings", label: "Engineer Stamped Drawings Required", type: "select", options: ["Yes","No","TBD","By Others"], role: "designer", section: "Project Scope" },
  // Beam Callouts
  { key: "beam1_name", label: "Beam 1 — Name/Location", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "beam1_size", label: "Beam 1 — Size", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "beam1_span", label: "Beam 1 — Span (ft)", type: "number", role: "designer", section: "Beam Callouts" },
  { key: "beam1_connection", label: "Beam 1 — Connection Type", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "beam2_name", label: "Beam 2 — Name/Location", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "beam2_size", label: "Beam 2 — Size", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "beam2_span", label: "Beam 2 — Span (ft)", type: "number", role: "designer", section: "Beam Callouts" },
  { key: "beam2_connection", label: "Beam 2 — Connection Type", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "beam3_name", label: "Beam 3 — Name/Location", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "beam3_size", label: "Beam 3 — Size", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "beam3_span", label: "Beam 3 — Span (ft)", type: "number", role: "designer", section: "Beam Callouts" },
  { key: "beam3_connection", label: "Beam 3 — Connection Type", type: "text", role: "designer", section: "Beam Callouts" },
  { key: "additional_beam_notes", label: "Additional Beam Notes (4+ beams)", type: "textarea", role: "designer", section: "Beam Callouts" },
  // Column Callouts
  { key: "col1_location", label: "Column 1 — Location", type: "text", role: "designer", section: "Column Callouts" },
  { key: "col1_size", label: "Column 1 — Size", type: "text", role: "designer", section: "Column Callouts" },
  { key: "col1_height", label: "Column 1 — Height (ft)", type: "number", role: "designer", section: "Column Callouts" },
  { key: "col1_base_plate", label: "Column 1 — Base Plate Size", type: "text", role: "designer", section: "Column Callouts" },
  { key: "col1_cap_plate", label: "Column 1 — Cap Plate Size", type: "text", role: "designer", section: "Column Callouts" },
  { key: "col2_location", label: "Column 2 — Location", type: "text", role: "designer", section: "Column Callouts" },
  { key: "col2_size", label: "Column 2 — Size", type: "text", role: "designer", section: "Column Callouts" },
  { key: "col2_height", label: "Column 2 — Height (ft)", type: "number", role: "designer", section: "Column Callouts" },
  { key: "col2_base_plate", label: "Column 2 — Base Plate Size", type: "text", role: "designer", section: "Column Callouts" },
  { key: "col2_cap_plate", label: "Column 2 — Cap Plate Size", type: "text", role: "designer", section: "Column Callouts" },
  { key: "additional_column_notes", label: "Additional Column Notes (3+ columns)", type: "textarea", role: "designer", section: "Column Callouts" },
  // Finish
  { key: "powder_coat_color", label: "Powder Coat Color", type: "text", role: "both", section: "Finish" },
  { key: "ral_code", label: "RAL / Color Code", type: "text", role: "both", section: "Finish" },
  { key: "finish_type", label: "Finish Type", type: "select", options: ["Powder Coat","Paint","Raw","Galvanized","Primer Only","Other"], role: "both", section: "Finish" },
  // Install Details
  { key: "install_location_desc", label: "Specific Install Location Description", type: "textarea", role: "installer", section: "Install Details" },
  { key: "foundation_method", label: "Foundation / Anchor Method", type: "select", options: ["Concrete Footer","Slab Anchor","Attach to Existing Structure","TBD"], role: "installer", section: "Install Details" },
  { key: "surface_at_base", label: "Surface at Base", type: "select", options: ["Concrete","Wood","Dirt","Other"], role: "installer", section: "Install Details" },
  { key: "crane_rigging", label: "Crane / Rigging Required", type: "select", options: ["Yes","No","Maybe"], role: "installer", section: "Install Details" },
  { key: "lift_scaffold", label: "Lift / Scaffold Required", type: "select", options: ["Yes","No","Maybe"], role: "installer", section: "Install Details" },
  { key: "estimated_install_time", label: "Estimated Install Time (hrs)", type: "number", role: "installer", section: "Install Details" },
  { key: "num_installers", label: "Number of Installers Needed", type: "number", role: "installer", section: "Install Details" },
];

// ─── PERGOLA ─────────────────────────────────────────────────────────────────
const PERGOLA_FIELDS = [
  { key: "structure_type", label: "Structure Type", type: "select", options: ["Pergola","Shade Structure","Carport","Awning","Canopy"], role: "both", section: "Project Scope" },
  { key: "attachment_type", label: "Attachment Type", type: "select", options: ["Freestanding","Attached to House","Attached to Existing Structure"], role: "both", section: "Project Scope" },
  { key: "code_type", label: "Code Type", type: "select", options: ["Residential","Commercial","HOA","Permit Required"], role: "both", section: "Project Scope" },
  { key: "dimensions", label: "Approximate Dimensions (L x W x H)", type: "text", role: "both", section: "Project Scope" },
  // Design Details
  { key: "roof_style", label: "Roof Style", type: "select", options: ["Open Rafter","Louvered","Solid Panel","Corrugated","None"], role: "designer", section: "Design Details" },
  { key: "column_type", label: "Column Type", type: "select", options: ["Square Tube","Round Tube","C-Channel","Custom"], role: "designer", section: "Design Details" },
  { key: "column_size", label: "Column Size", type: "text", role: "designer", section: "Design Details" },
  { key: "beam_size", label: "Beam Size", type: "text", role: "designer", section: "Design Details" },
  { key: "rafter_size", label: "Rafter Size", type: "text", role: "designer", section: "Design Details" },
  { key: "rafter_spacing", label: "Rafter Spacing", type: "text", role: "designer", section: "Design Details" },
  { key: "decorative_end_cuts", label: "Decorative End Cuts on Rafters", type: "select", options: ["Yes","No"], role: "designer", section: "Design Details" },
  { key: "lighting_provision", label: "Lighting Provision", type: "select", options: ["Yes","No","By Others"], role: "both", section: "Design Details" },
  { key: "fan_mount", label: "Fan Mount Provision", type: "select", options: ["Yes","No"], role: "both", section: "Design Details" },
  { key: "special_design_notes", label: "Special Design Notes", type: "textarea", role: "designer", section: "Design Details" },
  // Finish
  ...STANDARD_FINISH_FIELDS.map(f => ({ ...f, section: "Finish" })),
  // Install Details
  { key: "install_location_desc", label: "Specific Install Location Description", type: "textarea", role: "installer", section: "Install Details" },
  { key: "post_footing_method", label: "Post Footing Method", type: "select", options: ["Set in Concrete","Surface Mount","Attach to Deck","TBD"], role: "installer", section: "Install Details" },
  { key: "attachment_to_house", label: "Attachment Point to House", type: "select", options: ["Ledger to Stucco","Ledger to Wood","Ledger to Brick","N/A"], role: "installer", section: "Install Details" },
  { key: "surface_at_base", label: "Surface at Base", type: "select", options: ["Concrete","Pavers","Deck","Dirt","Other"], role: "installer", section: "Install Details" },
  { key: "lift_scaffold", label: "Lift / Scaffold Required", type: "select", options: ["Yes","No","Maybe"], role: "installer", section: "Install Details" },
  { key: "estimated_install_time", label: "Estimated Install Time (hrs)", type: "number", role: "installer", section: "Install Details" },
  { key: "num_installers", label: "Number of Installers Needed", type: "number", role: "installer", section: "Install Details" },
];

// ─── PLANTER BOX ─────────────────────────────────────────────────────────────
const PLANTER_BOX_FIELDS = [
  { key: "num_boxes", label: "Number of Planter Boxes", type: "number", role: "both", section: "Project Scope" },
  { key: "location", label: "Location", type: "select", options: ["Interior","Exterior","Both"], role: "both", section: "Project Scope" },
  // Design Details
  { key: "dimensions", label: "Dimensions per Box (L x W x H)", type: "text", role: "designer", section: "Design Details" },
  { key: "wall_thickness", label: "Wall Thickness / Gauge", type: "select", options: ["10ga","12ga","14ga","16ga","Custom"], role: "designer", section: "Design Details" },
  { key: "frame_requirement", label: "Frame / Structural Requirement", type: "select", options: ["Frame Required","Shell Only","Custom"], role: "designer", section: "Design Details" },
  { key: "liner_required", label: "Liner Required", type: "select", options: ["Yes","No","By Others"], role: "designer", section: "Design Details" },
  { key: "drain_holes", label: "Drain Holes Required", type: "select", options: ["Yes","No","Customer Drills Own"], role: "designer", section: "Design Details" },
  { key: "legs_feet", label: "Legs / Feet", type: "select", options: ["Yes - Welded","Yes - Bolt-on","No"], role: "designer", section: "Design Details" },
  { key: "leg_height", label: "Leg Height (if applicable)", type: "text", role: "designer", section: "Design Details" },
  { key: "decorative_texture", label: "Decorative Texture / Pattern", type: "select", options: ["Smooth","Hammered","Corten","Corrugated","Custom"], role: "designer", section: "Design Details" },
  { key: "special_design_notes", label: "Special Design Notes", type: "textarea", role: "designer", section: "Design Details" },
  // Finish
  { key: "powder_coat_color", label: "Powder Coat Color", type: "text", role: "both", section: "Finish" },
  { key: "ral_code", label: "RAL / Color Code", type: "text", role: "both", section: "Finish" },
  { key: "finish_type", label: "Finish Type", type: "select", options: ["Powder Coat","Paint","Raw","Corten","Galvanized","Other"], role: "both", section: "Finish" },
  // Install Details
  { key: "install_location_desc", label: "Specific Install Location Description", type: "textarea", role: "installer", section: "Install Details" },
  { key: "anchored_to_surface", label: "Anchored to Surface", type: "select", options: ["Yes","No","Optional"], role: "installer", section: "Install Details" },
  { key: "surface_type", label: "Surface Type", type: "select", options: ["Concrete","Wood","Pavers","Dirt","Other"], role: "installer", section: "Install Details" },
  { key: "estimated_install_time", label: "Estimated Install Time (hrs)", type: "number", role: "installer", section: "Install Details" },
  { key: "num_installers", label: "Number of Installers Needed", type: "number", role: "installer", section: "Install Details" },
];

// ─── CHIMNEY CAP ─────────────────────────────────────────────────────────────
const CHIMNEY_CAP_FIELDS = [
  { key: "num_caps", label: "Number of Chimney Caps", type: "number", role: "both", section: "Project Scope" },
  { key: "cap_style", label: "Cap Style", type: "select", options: ["Flat Top","Hip Roof","Shed Roof","Custom","Match Existing"], role: "both", section: "Project Scope" },
  { key: "code_type", label: "Code Type", type: "select", options: ["Residential","Commercial"], role: "both", section: "Project Scope" },
  // Design Details
  { key: "flue_width", label: "Flue Opening Width (inches)", type: "number", role: "designer", section: "Design Details" },
  { key: "flue_depth", label: "Flue Opening Depth (inches)", type: "number", role: "designer", section: "Design Details" },
  { key: "num_flue_openings", label: "Number of Flue Openings", type: "number", role: "designer", section: "Design Details" },
  { key: "cap_width", label: "Overall Cap Width (inches)", type: "number", role: "designer", section: "Design Details" },
  { key: "cap_depth", label: "Overall Cap Depth (inches)", type: "number", role: "designer", section: "Design Details" },
  { key: "cap_height", label: "Cap Height (inches)", type: "number", role: "designer", section: "Design Details" },
  { key: "overhang", label: "Overhang on Each Side (inches)", type: "number", role: "designer", section: "Design Details" },
  { key: "material_gauge", label: "Material / Gauge", type: "select", options: ["10ga Steel","12ga Steel","14ga Steel","16ga Steel","Stainless Steel","Copper","Custom"], role: "designer", section: "Design Details" },
  { key: "screen_mesh", label: "Screen / Mesh Required", type: "select", options: ["Yes","No"], role: "designer", section: "Design Details" },
  { key: "mesh_size", label: "Mesh Size", type: "select", options: ['3/4"','1/2"','1/4"',"None"], role: "designer", section: "Design Details" },
  { key: "wind_directional", label: "Wind Directional Cap", type: "select", options: ["Yes","No"], role: "designer", section: "Design Details" },
  { key: "rain_guard", label: "Rain Guard / Drip Edge", type: "select", options: ["Yes","No"], role: "designer", section: "Design Details" },
  { key: "custom_cutout", label: "Custom Design or Logo Cut-out", type: "select", options: ["Yes","No"], role: "designer", section: "Design Details" },
  { key: "special_design_notes", label: "Special Design Notes", type: "textarea", role: "designer", section: "Design Details" },
  // Finish
  { key: "powder_coat_color", label: "Powder Coat Color", type: "text", role: "both", section: "Finish" },
  { key: "ral_code", label: "RAL / Color Code", type: "text", role: "both", section: "Finish" },
  { key: "finish_type", label: "Finish Type", type: "select", options: ["Powder Coat","Paint","Raw","Galvanized","Stainless Natural","Copper Natural","Other"], role: "both", section: "Finish" },
  { key: "touchup_paint", label: "Touch-up Paint Needed on Site", type: "select", options: ["Yes","No"], role: "both", section: "Finish" },
  // Install Details
  { key: "chimney_location", label: "Chimney Location on Roof", type: "select", options: ["Front","Rear","Left Side","Right Side","Center","Multiple"], role: "installer", section: "Install Details" },
  { key: "install_location_desc", label: "Specific Location Description", type: "textarea", role: "installer", section: "Install Details" },
  { key: "chimney_material", label: "Chimney Material (what cap mounts to)", type: "select", options: ["Brick","Stone","Stucco","Metal Flue Pipe","Prefab Chase","Other"], role: "installer", section: "Install Details" },
  { key: "attachment_method", label: "Attachment Method", type: "select", options: ["Set Screws into Flue","Mortar","Straps","Welded Bracket","Custom"], role: "installer", section: "Install Details" },
  { key: "roof_pitch", label: "Roof Pitch", type: "select", options: ["Flat","Low (1-3/12)","Medium (4-7/12)","Steep (8-12/12)","Very Steep (12+/12)"], role: "installer", section: "Install Details" },
  { key: "roof_material", label: "Roof Material (to walk on)", type: "select", options: ["Composition Shingle","Tile","Metal","Flat Membrane","Other"], role: "installer", section: "Install Details" },
  { key: "roof_access", label: "Ladder / Roof Access Required", type: "select", options: ["Yes — bring extension ladder","Yes — scaffolding needed","Roof walk only"], role: "installer", section: "Install Details" },
  { key: "estimated_install_time", label: "Estimated Install Time (hrs)", type: "number", role: "installer", section: "Install Details" },
  { key: "num_installers", label: "Number of Installers Needed", type: "number", role: "installer", section: "Install Details" },
];

export const PRODUCT_FIELDS = {
  Railing: RAILING_FIELDS,
  Staircase: STAIRCASE_FIELDS,
  Gate: GATE_FIELDS,
  Structural: STRUCTURAL_FIELDS,
  Pergola: PERGOLA_FIELDS,
  "Planter Box": PLANTER_BOX_FIELDS,
  "Chimney Cap": CHIMNEY_CAP_FIELDS,
};

// ─── Job-level materials checklist (standard items shown for every job) ──────
export const JOB_MATERIALS_CHECKLIST = [
  { key: "mat_anchor_bolts", label: "Anchor Bolts" },
  { key: "mat_base_plates", label: "Base Plates" },
  { key: "mat_concrete_anchors", label: "Concrete Anchors" },
  { key: "mat_lag_bolts", label: "Lag Bolts & Wood Screws" },
  { key: "mat_through_bolts", label: "Through Bolts" },
  { key: "mat_touchup_paint", label: "Touch-up Paint & Pen" },
  { key: "mat_silicone", label: "Silicone & Caulk" },
  { key: "mat_level", label: "Level" },
  { key: "mat_template", label: "Template & Jig" },
  { key: "mat_grinder", label: "Grinder & Angle Grinder" },
  { key: "mat_post_caps", label: "Post Caps & Safety Caps" },
  { key: "mat_cable_tensioners", label: "Cable Tensioners & End Fittings" },
];