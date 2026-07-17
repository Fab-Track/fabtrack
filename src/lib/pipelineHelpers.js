import { differenceInDays, parseISO, isValid } from "date-fns";

// ── Sales Board ────────────────────────────────────────────────────────────────
export const SALES_STAGES = [
  "New Lead",
  "Estimate in Progress",
  "Estimate Sent",
  "Negotiation / In Review",
  "Awaiting Deposit",
  "Deposit Received / Sale Won",
];

// ── Shop Board ─────────────────────────────────────────────────────────────────
export const SHOP_STAGES = [
  "New Jobs Landed — Needs Approval",
  "On Deck for Measure",
  "Ready for Measure",
  "Needs Drawing",
  "Drawing Needs Approval",
  "On Deck for Fabrication",
  "Fabricate",
  "Fabrication Complete — Needs Powder Coat",
  "At Powder Coat",
  "Ready for Install",
  "Install in Progress / Not Complete",
  "Install Complete",
];

// ── Billing Board ──────────────────────────────────────────────────────────────
export const BILLING_STAGES = [
  "Needs 2nd Half Invoice Created",
  "2nd Half Invoice Sent",
  "10 Days Overdue",
  "15 Days Overdue",
  "20 Days Overdue",
  "30 Days Overdue",
  "30+ Days Overdue",
  "Paid / Closed",
];

// ── Role access ────────────────────────────────────────────────────────────────
export const BOARD_ACCESS = {
  Sales:   ["owner", "estimator", "admin", "installer"],
  Shop: ["owner", "shop_manager", "fabricator", "installer", "design_specialist", "foreman", "admin", "estimator"],
  Billing: ["owner", "estimator", "admin", "accountant", "installer"],
};

export function getBoardsForRole(role) {
  if (!role) return ["Sales", "Shop", "Billing"];
  const r = role.toLowerCase();
  // Super admins have full access to all boards
  if (r === "super_admin") return ["Sales", "Shop", "Billing"];
  const boards = ["Sales", "Shop", "Billing"].filter(board =>
    BOARD_ACCESS[board].includes(r)
  );
  // Unrecognized roles fall back to all boards so the page never gets stuck
  return boards.length ? boards : ["Sales", "Shop", "Billing"];
}

export function getDefaultBoard(role) {
  const boards = getBoardsForRole(role);
  // Shop-only roles land on Shop
  if (boards.length === 1) return boards[0];
  if (!boards.includes("Sales") && boards.includes("Shop")) return "Shop";
  return boards[0];
}

// ── Column colors ──────────────────────────────────────────────────────────────
export const SALES_COLORS = {
  "New Lead":                      "border-t-slate-400",
  "Estimate in Progress":          "border-t-blue-400",
  "Estimate Sent":                 "border-t-blue-600",
  "Negotiation / In Review":       "border-t-amber-500",
  "Awaiting Deposit":              "border-t-orange-500",
  "Deposit Received / Sale Won":   "border-t-emerald-500",
};

export const SHOP_COLORS = {
  "New Jobs Landed — Needs Approval":        "border-t-slate-400",
  "On Deck for Measure":                     "border-t-sky-400",
  "Ready for Measure":                       "border-t-sky-600",
  "Needs Drawing":                           "border-t-violet-400",
  "Drawing Needs Approval":                  "border-t-violet-600",
  "On Deck for Fabrication":                 "border-t-amber-400",
  "Fabricate":                               "border-t-amber-600",
  "Fabrication Complete — Needs Powder Coat":"border-t-orange-400",
  "At Powder Coat":                          "border-t-orange-600",
  "Ready for Install":                       "border-t-cyan-500",
  "Install in Progress / Not Complete":      "border-t-cyan-700",
  "Install Complete":                        "border-t-emerald-500",
};

export const BILLING_COLORS = {
  "Needs 2nd Half Invoice Created": "border-t-slate-400",
  "2nd Half Invoice Sent":          "border-t-blue-400",
  "10 Days Overdue":                "border-t-yellow-300",
  "15 Days Overdue":                "border-t-yellow-500",
  "20 Days Overdue":                "border-t-orange-400",
  "30 Days Overdue":                "border-t-red-500",
  "30+ Days Overdue":               "border-t-red-800",
  "Paid / Closed":                  "border-t-emerald-500",
};

export const BILLING_CARD_BG = {
  "Needs 2nd Half Invoice Created": "bg-slate-50",
  "2nd Half Invoice Sent":          "bg-blue-50",
  "10 Days Overdue":                "bg-yellow-50",
  "15 Days Overdue":                "bg-yellow-100",
  "20 Days Overdue":                "bg-orange-50",
  "30 Days Overdue":                "bg-red-50",
  "30+ Days Overdue":               "bg-red-100",
  "Paid / Closed":                  "bg-emerald-50",
};

// ── Derive which board a job belongs to ────────────────────────────────────────
export function getBoardForJob(job) {
  if (!job) return "Sales";
  if (job.pipeline_board) return job.pipeline_board;
  if (job.stage) {
    if (SHOP_STAGES.includes(job.stage)) return "Shop";
    if (BILLING_STAGES.includes(job.stage)) return "Billing";
    if (SALES_STAGES.includes(job.stage)) return "Sales";
  }
  if (job.status) {
    if (["Fab Queue", "In Fabrication", "Powder Coat", "Install Scheduled", "Install Complete"].includes(job.status)) return "Shop";
    if (job.status === "Invoiced") return "Billing";
  }
  return "Sales";
}

// ── Days in stage ──────────────────────────────────────────────────────────────
export function daysInStage(job) {
  if (!job.stage_entered_at) return 0;
  const d = parseISO(job.stage_entered_at);
  if (!isValid(d)) return 0;
  return differenceInDays(new Date(), d);
}

// ── Stage → legacy status mapping ─────────────────────────────────────────────
function stageToStatus(toBoard, toStage) {
  if (toBoard === "Billing") {
    return toStage === "Paid / Closed" ? "Invoiced" : "Invoiced";
  }
  if (toBoard === "Shop") {
    const shopMap = {
      "New Jobs Landed — Needs Approval": "Approved",
      "On Deck for Measure": "Approved",
      "Ready for Measure": "Approved",
      "Needs Drawing": "Approved",
      "Drawing Needs Approval": "Approved",
      "On Deck for Fabrication": "Fab Queue",
      "Fabricate": "In Fabrication",
      "Fabrication Complete — Needs Powder Coat": "Powder Coat",
      "At Powder Coat": "Powder Coat",
      "Ready for Install": "Install Scheduled",
      "Install in Progress / Not Complete": "Install Scheduled",
      "Install Complete": "Install Complete",
    };
    return shopMap[toStage] || "Approved";
  }
  // Sales board
  const salesMap = {
    "New Lead": "Estimate",
    "Estimate in Progress": "Estimate",
    "Estimate In Progress": "Estimate",
    "Estimate Sent": "Estimate",
    "Negotiation / In Review": "Estimate",
    "Awaiting Deposit": "Approved",
    "Deposit Received / Sale Won": "Approved",
  };
  return salesMap[toStage] || "Estimate";
}

// ── Move job to a new stage (returns update payload) ──────────────────────────
export function buildStageTransition(job, toBoard, toStage, note = "") {
  const now = new Date().toISOString();
  const historyEntry = {
    from_board: job.pipeline_board || "Sales",
    to_board: toBoard,
    from_stage: job.stage || "",
    to_stage: toStage,
    timestamp: now,
    note,
  };
  return {
    pipeline_board: toBoard,
    stage: toStage,
    stage_entered_at: now,
    stage_history: [...(job.stage_history || []), historyEntry],
    last_activity_date: now,
    status: stageToStatus(toBoard, toStage),
  };
}

// ── Per-column priority ranking ────────────────────────────────────────────────
// Jobs carry a `stage_priority` object keyed by stage name → rank (1 = highest, max 5).
// Set by drag-to-reorder or the priority menu.

// Maximum number of pinned (ranked) jobs allowed per stage.
export const MAX_PRIORITY_SLOTS = 5;

// Install-date sort key: soonest first; jobs with no valid date sink to the bottom.
function installSortKey(job) {
  const d = job.promised_install_date || job.expected_install_date;
  if (!d) return Infinity;
  const p = parseISO(d);
  return isValid(p) ? p.getTime() : Infinity;
}

// Oldest-job-first tiebreak key (Base44 created_date).
function createdKey(job) {
  if (!job.created_date) return Infinity;
  const p = parseISO(job.created_date);
  return isValid(p) ? p.getTime() : Infinity;
}

// Assigns contiguous ranks 1..MAX_PRIORITY_SLOTS to the jobs listed in orderedIds
// (in that order). Any job beyond slot 5, and any previously-pinned job not in
// orderedIds, has its rank for this stage cleared. Returns the minimal set of
// { jobId, stage_priority } updates. This is the single source of truth for
// writing pins — drag, the menu, and gap-closing all go through it.
function assignPinRanks(allJobs, orderedIds, stage) {
  const updates = [];
  const jobById = new Map(allJobs.map(j => [j.id, j]));
  const kept = new Set();

  orderedIds.slice(0, MAX_PRIORITY_SLOTS).forEach((id, i) => {
    const j = jobById.get(id);
    if (!j) return;
    kept.add(id);
    const rank = i + 1;
    if (j.stage_priority?.[stage] !== rank) {
      updates.push({ jobId: id, stage_priority: { ...(j.stage_priority || {}), [stage]: rank } });
    }
  });

  allJobs.forEach(j => {
    if (!kept.has(j.id) && typeof j.stage_priority?.[stage] === "number") {
      const rest = { ...(j.stage_priority || {}) };
      delete rest[stage];
      updates.push({ jobId: j.id, stage_priority: rest });
    }
  });

  return updates;
}

export function sortColumnJobs(jobs, stage) {
  const ranked = jobs
    .filter(j => typeof j.stage_priority?.[stage] === "number")
    .sort((a, b) => a.stage_priority[stage] - b.stage_priority[stage]);

  const tail = jobs
    .filter(j => typeof j.stage_priority?.[stage] !== "number")
    .sort((a, b) => {
      const ka = installSortKey(a), kb = installSortKey(b);
      if (ka !== kb) return ka - kb;
      return createdKey(a) - createdKey(b);
    });

  return [...ranked, ...tail];
}

// Menu-driven priority change. direction: "top" | "up" | "down" | "clear".
// Returns the { jobId, stage_priority } updates needed. Enforces the 5-slot cap.
export function computePriorityChange(columnJobs, job, stage, direction) {
  const pins = columnJobs
    .filter(j => typeof j.stage_priority?.[stage] === "number")
    .sort((a, b) => a.stage_priority[stage] - b.stage_priority[stage]);
  const ordered = pins.map(j => j.id);
  const idx = ordered.indexOf(job.id);

  if (direction === "clear") {
    if (idx === -1) return [];
    ordered.splice(idx, 1);
  } else if (direction === "top") {
    if (idx !== -1) ordered.splice(idx, 1);
    ordered.unshift(job.id);
  } else if (direction === "up") {
    if (idx === -1) ordered.push(job.id); // "Add to Priority List" → bottom slot
    else if (idx > 0) [ordered[idx - 1], ordered[idx]] = [ordered[idx], ordered[idx - 1]];
  } else if (direction === "down") {
    if (idx === -1) return [];
    if (idx < ordered.length - 1) [ordered[idx + 1], ordered[idx]] = [ordered[idx], ordered[idx + 1]];
    else ordered.splice(idx, 1); // moving below the last pin unpins it
  } else {
    return [];
  }

  return assignPinRanks(columnJobs, ordered, stage);
}

// Closes the rank gap left behind in a stage's column after a job leaves it
// (moved to another stage). Remaining ranked jobs are renumbered 1..N with no gaps.
export function closePriorityGap(columnJobs, stage, movedJobId) {
  const ordered = columnJobs
    .filter(j => j.id !== movedJobId && typeof j.stage_priority?.[stage] === "number")
    .sort((a, b) => a.stage_priority[stage] - b.stage_priority[stage])
    .map(j => j.id);
  return assignPinRanks(columnJobs, ordered, stage);
}

// Same-stage drag reorder. sortedColumnJobs is the sortColumnJobs-sorted list;
// sourceIndex/destIndex are positions within it.
export function reorderColumnPriority(sortedColumnJobs, sourceIndex, destIndex, stage) {
  const dragged = sortedColumnJobs[sourceIndex];
  if (!dragged) return [];

  const pins = sortedColumnJobs
    .filter(j => typeof j.stage_priority?.[stage] === "number" && j.id !== dragged.id)
    .sort((a, b) => a.stage_priority[stage] - b.stage_priority[stage]);

  // A drop pins the job only if it lands inside the band or the slot immediately
  // after the last pin (lets you grow the list), and within the 5-slot cap.
  const canPin = destIndex < MAX_PRIORITY_SLOTS && destIndex <= pins.length;

  const ordered = pins.map(j => j.id);
  if (canPin) ordered.splice(destIndex, 0, dragged.id);

  return assignPinRanks(sortedColumnJobs, ordered, stage);
}

// ── Payment status (3-state, derived from invoices only — no manual flag) ─────
// "not_invoiced"  — no invoice exists for the job
// "partial"       — an invoice exists but the full amount hasn't been collected yet
// "paid_in_full"  — total collected covers the total invoiced amount
export function getPaymentStatus(jobInvoices = []) {
  const totalInvoiced = jobInvoices.reduce((s, i) => s + (i.total || 0), 0);
  if (jobInvoices.length === 0 || totalInvoiced <= 0) return "not_invoiced";
  const totalCollected = jobInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  if (totalCollected >= totalInvoiced) return "paid_in_full";
  return "partial";
}

// ── Billing overdue stage calculator ──────────────────────────────────────────
export function calcBillingStage(invoiceSentDate, amountPaid, total) {
  // If there's no invoice yet, the job still needs one created
  if (!invoiceSentDate) return "Needs 2nd Half Invoice Created";
  // Only mark as paid if there's actually a payment
  if (total > 0 && amountPaid >= total) return "Paid / Closed";
  const days = differenceInDays(new Date(), parseISO(invoiceSentDate));
  if (days >= 30) return "30+ Days Overdue";
  if (days >= 20) return "20 Days Overdue";
  if (days >= 15) return "15 Days Overdue";
  if (days >= 10) return "10 Days Overdue";
  return "2nd Half Invoice Sent";
}