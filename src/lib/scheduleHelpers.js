import { addDays, addWeeks, subWeeks, parseISO, isValid, format, isBefore, isSameDay } from "date-fns";

// Phase definitions in chronological order.
// weeksToNext = gap (in weeks) between this phase's date and the next phase's date.
export const PHASE_DEFS = [
  { name: "Measure",     weeksToNext: 1, color: "sky",     tailwind: "bg-sky-500",     text: "text-sky-700",     light: "bg-sky-100" },
  { name: "Draw/Design", weeksToNext: 1, color: "purple",  tailwind: "bg-purple-500",  text: "text-purple-700",  light: "bg-purple-100" },
  { name: "Fab",         weeksToNext: 3, color: "orange",  tailwind: "bg-orange-500",  text: "text-orange-700",  light: "bg-orange-100" },
  { name: "Powder Coat", weeksToNext: 1, color: "blue",    tailwind: "bg-blue-500",    text: "text-blue-700",    light: "bg-blue-100" },
  { name: "Install",     weeksToNext: 0, color: "emerald", tailwind: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-100" },
];

export const TOTAL_WEEKS = 6;

// Map old phase names to new ones for backward compatibility
const PHASE_NAME_MAP = {
  "Fabricate": "Fab",
  "Draw": "Draw/Design",
};

export function normalizePhaseName(name) {
  return PHASE_NAME_MAP[name] || name;
}

// Bump a weekend date to the next Monday
export function ensureWeekday(date) {
  const d = new Date(date);
  if (d.getDay() === 6) return addDays(d, 2); // Saturday → Monday
  if (d.getDay() === 0) return addDays(d, 1); // Sunday → Monday
  return d;
}

// Calculate phase status relative to today
export function getPhaseStatus(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseISO(dateStr);
  if (isBefore(d, today)) return "complete";
  if (isSameDay(d, today)) return "in_progress";
  return "upcoming";
}

function buildPhases(dates) {
  return PHASE_DEFS.map(def => {
    const status = getPhaseStatus(dates[def.name]);
    return {
      name: def.name,
      startDate: dates[def.name],
      endDate: dates[def.name],
      status,
      completedAt: status === "complete" ? new Date().toISOString() : null,
      color: def.color,
      manuallyEdited: false,
    };
  });
}

/**
 * Calculate all phase dates working backward from an install date.
 * Powder Coat = Install - 1 week
 * Fab = Powder Coat - 3 weeks
 * Draw/Design = Fab - 1 week
 * Measure = Draw/Design - 1 week
 */
export function calculateFromInstallDate(installDateStr) {
  let installDate = parseISO(installDateStr);
  if (!isValid(installDate)) return null;

  const bumped = ensureWeekday(installDate);
  const wasBumped = !isSameDay(bumped, installDate);
  installDate = bumped;

  const dates = {};
  let currentDate = new Date(installDate);

  // Work backward through phases (Install → Powder Coat → Fab → Draw/Design → Measure)
  for (let i = PHASE_DEFS.length - 1; i >= 0; i--) {
    const def = PHASE_DEFS[i];
    dates[def.name] = format(currentDate, "yyyy-MM-dd");
    if (i > 0) {
      const gap = PHASE_DEFS[i - 1].weeksToNext;
      currentDate = ensureWeekday(subWeeks(currentDate, gap));
    }
  }

  return { phases: buildPhases(dates), wasBumped, bumpedDate: format(installDate, "yyyy-MM-dd") };
}

/**
 * Calculate all phase dates working forward from a measure date.
 * Draw/Design = Measure + 1 week
 * Fab = Draw/Design + 1 week
 * Powder Coat = Fab + 3 weeks
 * Install = Powder Coat + 1 week
 */
export function calculateFromMeasureDate(measureDateStr) {
  let measureDate = parseISO(measureDateStr);
  if (!isValid(measureDate)) return null;

  const bumped = ensureWeekday(measureDate);
  const wasBumped = !isSameDay(bumped, measureDate);
  measureDate = bumped;

  const dates = {};
  let currentDate = new Date(measureDate);

  for (let i = 0; i < PHASE_DEFS.length; i++) {
    const def = PHASE_DEFS[i];
    dates[def.name] = format(currentDate, "yyyy-MM-dd");
    if (i < PHASE_DEFS.length - 1) {
      currentDate = ensureWeekday(addWeeks(currentDate, def.weeksToNext));
    }
  }

  return { phases: buildPhases(dates), wasBumped, bumpedDate: format(measureDate, "yyyy-MM-dd") };
}

// Migrate/normalize stored schedule_phases to current format
export function normalizePhases(phases) {
  if (!phases || !Array.isArray(phases)) return [];
  return phases.map(p => ({
    ...p,
    name: normalizePhaseName(p.name),
    manuallyEdited: p.manuallyEdited || false,
  }));
}

export function getPhaseColors(color) {
  const map = {
    emerald: { bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-400", hex: "#10b981" },
    blue:    { bg: "bg-blue-500",    light: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-400",    hex: "#3b82f6" },
    orange:  { bg: "bg-orange-500",  light: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-400",  hex: "#f97316" },
    purple:  { bg: "bg-purple-500",  light: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-400",  hex: "#a855f7" },
    sky:     { bg: "bg-sky-500",     light: "bg-sky-100",     text: "text-sky-700",     border: "border-sky-400",     hex: "#0ea5e9" },
    // legacy aliases
    lime:    { bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-400", hex: "#10b981" },
  };
  return map[color] || map.blue;
}