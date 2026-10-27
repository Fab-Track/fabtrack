// Sales Pipeline Foundation — stage definitions, gates, migration, and helpers

// ── New Sales Stages (replaces the old 6-stage list) ──────────────────────────
export const SALES_STAGES = [
  "New Inquiry",
  "Qualifying",
  "Estimating",
  "Pricing Review",
  "Estimate Sent",
  "Negotiating",
  "Awaiting Deposit",
  "Won",
];

// Exit states (not shown as columns — handled via Close Lead modal)
export const SALES_EXIT_STATES = ["Lost", "Nurture"];

// Lost reason options (required when closing as Lost)
export const LOST_REASONS = [
  "Price",
  "Timing",
  "Chose competitor",
  "Ghosted",
  "Not a fit",
  "Project cancelled",
];

// ── Stage colors (hex for PipelineStageConfig seeding) ────────────────────────
export const SALES_COLORS = {
  "New Inquiry":       "#94a3b8",
  "Qualifying":        "#60a5fa",
  "Estimating":        "#3b82f6",
  "Pricing Review":    "#a78bfa",
  "Estimate Sent":     "#2563eb",
  "Negotiating":       "#f59e0b",
  "Awaiting Deposit":  "#f97316",
  "Won":               "#10b981",
};

// ── Lead source options ────────────────────────────────────────────────────────
export const LEAD_SOURCES = [
  "Website",
  "Phone",
  "Referral",
  "Contractor Repeat",
  "Walk-in",
  "Manual",
  "Other",
];

// ── Lead intent options ────────────────────────────────────────────────────────
export const LEAD_INTENTS = [
  "Ready to Buy",
  "Price Shopping",
  "Budgetary Only",
];

// ── Blocker options ────────────────────────────────────────────────────────────
export const LEAD_BLOCKERS = [
  "Missing Info",
  "Waiting on Customer",
  "Waiting on Budget",
  "Waiting on GC",
];

// ── Customer type options ─────────────────────────────────────────────────────
export const LEAD_CUSTOMER_TYPES = ["Contractor", "Homeowner"];

// ── Pricing Review threshold ──────────────────────────────────────────────────
export const PRICING_REVIEW_THRESHOLD = 6000;

/**
 * Returns true if the estimate amount is below the Pricing Review threshold
 * and should skip Pricing Review.
 */
export function shouldSkipPricingReview(amount) {
  return typeof amount === "number" && amount > 0 && amount < PRICING_REVIEW_THRESHOLD;
}

// ── Size band derivation ──────────────────────────────────────────────────────
export function deriveSizeBand(amount) {
  if (!amount || amount <= 0) return null;
  if (amount < 5000) return "Under $5K";
  if (amount < 10000) return "$5K–$10K";
  if (amount < 25000) return "$10K–$25K";
  if (amount < 50000) return "$25K–$50K";
  return "$50K+";
}

// ── Stage probabilities (for weighted pipeline value) ─────────────────────────
export const STAGE_PROBABILITY = {
  "New Inquiry":      0,
  "Qualifying":       0.05,
  "Estimating":       0.10,
  "Pricing Review":   0.15,
  "Estimate Sent":    0.25,
  "Negotiating":      0.60,
  "Awaiting Deposit": 0.90,
  "Won":              1.0,
};

// ── Old → New stage migration mapping ─────────────────────────────────────────
export const STAGE_MIGRATION_MAP = {
  "New Lead":                          "New Inquiry",
  "Website Form New Lead":             "New Inquiry",
  "Manual New Lead":                   "New Inquiry",
  "Customer Contacted":                "Qualifying",
  "Estimate in Progress":              "Estimating",
  "Estimate In Progress":              "Estimating",
  "Estimate In Progress - Waiting on Customer": "Estimating",
  "Estimate Sent - Budget Stage":      "Estimate Sent",
  "Estimate Sent":                     "Estimate Sent",
  "Negotiation / In Review":           "Negotiating",
  "In Review":                         "Negotiating",
  "Awaiting Deposit":                 "Awaiting Deposit",
  "Deposit Received / Sale Won":       "Won",
  "Deposit Received":                  "Won",
  "Sale Won":                          "Won",
};

// Stages that require a blocker tag during migration
export const MIGRATION_BLOCKER_MAP = {
  "Estimate In Progress - Waiting on Customer": ["Waiting on Customer"],
  "Estimate Sent - Budget Stage": ["Waiting on Budget"],
};

/**
 * Maps an old Sales stage to the new stage name.
 * Returns null if the stage is not recognized (needs manual review).
 */
export function migrateStage(oldStage) {
  if (!oldStage) return "New Inquiry";
  if (SALES_STAGES.includes(oldStage)) return oldStage; // already migrated
  return STAGE_MIGRATION_MAP[oldStage] || null;
}

/**
 * Returns the blockers to apply during migration for a given old stage.
 */
export function getMigrationBlockers(oldStage) {
  return MIGRATION_BLOCKER_MAP[oldStage] || [];
}

// ── Stage entry gate requirements ─────────────────────────────────────────────
// Each gate defines the fields that must be present before a lead can
// enter that stage. If fields are missing at intake, a "Missing Info"
// blocker is auto-applied instead of blocking the save.
export const STAGE_GATES = {
  "New Inquiry": {
    required: ["customer_name", "lead_customer_phone_or_email", "job_type", "lead_source"],
    label: "New Inquiry requires name, phone or email, job type, and source",
  },
  "Qualifying": {
    required: ["site_address", "lead_customer_type"],
    label: "Qualifying requires scope (site address), location, timeline, and customer type",
  },
  "Estimating": {
    required: ["site_address"],
    label: "Estimating requires scope and location",
  },
  "Estimate Sent": {
    required: ["estimate_total", "next_action_date"],
    label: "Estimate Sent requires estimate amount, sent date, and next action date",
  },
  "Awaiting Deposit": {
    required: ["customer_approval_status_approved", "has_deposit_invoice"],
    label: "Awaiting Deposit requires signed contract and deposit invoice",
  },
};

/**
 * Validates whether a job satisfies the entry requirements for a target stage.
 * Returns { valid: boolean, missingFields: string[], message: string }.
 * Does NOT block the save — callers use this to auto-apply "Missing Info" blockers
 * or show guidance to the user.
 */
export function validateStageGate(job, targetStage) {
  const gate = STAGE_GATES[targetStage];
  if (!gate) return { valid: true, missingFields: [], message: "" };

  const missing = [];

  if (gate.required.includes("lead_customer_phone_or_email")) {
    if (!job.lead_customer_phone && !job.lead_customer_email && !job.onsite_contact_phone) {
      missing.push("phone or email");
    }
  }
  if (gate.required.includes("customer_name") && !job.customer_name) {
    missing.push("customer name");
  }
  if (gate.required.includes("job_type") && !job.job_type) {
    missing.push("job type");
  }
  if (gate.required.includes("lead_source") && !job.lead_source) {
    missing.push("source");
  }
  if (gate.required.includes("site_address") && !job.site_address) {
    missing.push("site address / location");
  }
  if (gate.required.includes("lead_customer_type") && !job.lead_customer_type) {
    missing.push("customer type");
  }
  if (gate.required.includes("estimate_total") && !job.estimate_total) {
    missing.push("estimate amount");
  }
  if (gate.required.includes("next_action_date") && !job.next_action_date) {
    missing.push("next action date");
  }
  if (gate.required.includes("customer_approval_status_approved") && job.customer_approval_status !== "approved") {
    missing.push("signed contract (customer approval)");
  }

  return {
    valid: missing.length === 0,
    missingFields: missing,
    message: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "",
  };
}

/**
 * Auto-applies the "Missing Info" blocker if gate fields are missing.
 * Returns the updated blockers array (or null if no change needed).
 */
export function autoApplyMissingInfoBlocker(job, targetStage) {
  const validation = validateStageGate(job, targetStage);
  if (validation.valid) return null;

  const blockers = job.lead_blockers || [];
  if (blockers.includes("Missing Info")) return null;

  return [...blockers, "Missing Info"];
}