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
  Shop:    ["owner", "shop_manager", "fabricator", "installer", "design_specialist", "foreman", "admin"],
  Billing: ["owner", "estimator", "admin", "accountant", "installer"],
};

export function getBoardsForRole(role) {
  if (!role) return ["Sales", "Shop", "Billing"];
  const r = role.toLowerCase();
  return ["Sales", "Shop", "Billing"].filter(board =>
    BOARD_ACCESS[board].includes(r)
  );
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

// ── Billing overdue stage calculator ──────────────────────────────────────────
export function calcBillingStage(invoiceSentDate, amountPaid, total) {
  if (amountPaid >= total) return "Paid / Closed";
  if (!invoiceSentDate) return "2nd Half Invoice Sent";
  const days = differenceInDays(new Date(), parseISO(invoiceSentDate));
  if (days >= 30) return "30+ Days Overdue";
  if (days >= 30) return "30 Days Overdue";
  if (days >= 20) return "20 Days Overdue";
  if (days >= 15) return "15 Days Overdue";
  if (days >= 10) return "10 Days Overdue";
  return "2nd Half Invoice Sent";
}