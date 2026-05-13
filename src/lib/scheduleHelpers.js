import { addDays, subDays, parseISO, isValid, format, isBefore, isAfter, isSameDay, differenceInCalendarDays } from "date-fns";

// Phase definitions (ordered from latest to earliest — we work backwards)
export const PHASE_DEFS = [
  { name: "Install Day",              businessDays: 1,  color: "emerald", tailwind: "bg-emerald-500",   border: "border-emerald-500",   text: "text-emerald-700",   light: "bg-emerald-100" },
  { name: "Ready for Install",        businessDays: 3,  color: "lime",    tailwind: "bg-lime-500",      border: "border-lime-500",      text: "text-lime-700",      light: "bg-lime-100" },
  { name: "Powder Coat",              businessDays: 5,  color: "blue",    tailwind: "bg-blue-500",      border: "border-blue-500",      text: "text-blue-700",      light: "bg-blue-100" },
  { name: "Fabrication",              businessDays: 10, color: "orange",  tailwind: "bg-orange-500",    border: "border-orange-500",    text: "text-orange-700",    light: "bg-orange-100" },
  { name: "Measure & Design Approval",businessDays: 5,  color: "purple",  tailwind: "bg-purple-500",    border: "border-purple-500",    text: "text-purple-700",    light: "bg-purple-100" },
];

export const STANDARD_RUNWAY = 24; // standard ~4 weeks of business days total

// Add N business days to a date
export function addBusinessDays(date, n) {
  let d = new Date(date);
  let added = 0;
  while (added < n) {
    d = addDays(d, 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

// Subtract N business days from a date
export function subtractBusinessDays(date, n) {
  let d = new Date(date);
  let subtracted = 0;
  while (subtracted < n) {
    d = subDays(d, 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) subtracted++;
  }
  return d;
}

// Count business days between two dates (inclusive)
export function countBusinessDays(start, end) {
  let count = 0;
  let d = new Date(start);
  while (d <= end) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    d = addDays(d, 1);
  }
  return count;
}

// Bump a weekend date to next Monday
export function ensureWeekday(date) {
  const d = new Date(date);
  if (d.getDay() === 6) return addDays(d, 2); // Saturday → Monday
  if (d.getDay() === 0) return addDays(d, 1); // Sunday → Monday
  return d;
}

// Calculate phase status relative to today
export function getPhaseStatus(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = parseISO(startDate);
  const e = parseISO(endDate);
  if (isBefore(e, today)) return "complete";
  if (isBefore(s, today) || isSameDay(s, today)) return "in_progress";
  return "upcoming";
}

/**
 * Generate production schedule phases working backwards from promisedInstallDate.
 * Returns array of phase objects with startDate, endDate, name, color, status.
 */
export function generateSchedule(promisedInstallDateStr) {
  let installDate = parseISO(promisedInstallDateStr);
  if (!isValid(installDate)) return null;

  // Bump weekend to Monday
  const bumped = ensureWeekday(installDate);
  const wasBumped = !isSameDay(bumped, installDate);
  installDate = bumped;

  // Total required business days
  const totalRequired = PHASE_DEFS.reduce((sum, p) => sum + p.businessDays, 0); // 24
  const availableBusinessDays = countBusinessDays(new Date(), installDate);
  const isTight = availableBusinessDays < totalRequired;

  const phases = [];
  let currentEnd = new Date(installDate);

  for (const def of PHASE_DEFS) {
    let days = def.businessDays;

    // Compress proportionally if tight
    if (isTight && totalRequired > 0) {
      days = Math.max(1, Math.round((def.businessDays / totalRequired) * availableBusinessDays));
    }

    const endDate = new Date(currentEnd);
    const startDate = subtractBusinessDays(endDate, days - 1);

    const existingStatus = getPhaseStatus(format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd"));

    phases.push({
      name: def.name,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      status: existingStatus,
      completedAt: existingStatus === "complete" ? new Date().toISOString() : null,
      color: def.color,
    });

    // Next phase ends one business day before this one starts
    currentEnd = subtractBusinessDays(startDate, 1);
  }

  return { phases: phases.reverse(), isTight, wasBumped, bumpedDate: format(installDate, "yyyy-MM-dd") };
}

export function getPhaseColors(color) {
  const map = {
    emerald: { bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-400", hex: "#10b981" },
    lime:    { bg: "bg-lime-500",    light: "bg-lime-100",    text: "text-lime-700",    border: "border-lime-400",    hex: "#84cc16" },
    blue:    { bg: "bg-blue-500",    light: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-400",    hex: "#3b82f6" },
    orange:  { bg: "bg-orange-500",  light: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-400",  hex: "#f97316" },
    purple:  { bg: "bg-purple-500",  light: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-400",  hex: "#a855f7" },
  };
  return map[color] || map.blue;
}