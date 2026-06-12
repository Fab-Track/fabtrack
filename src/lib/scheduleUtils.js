import {
  format, parseISO, isValid, startOfDay, startOfWeek, startOfMonth, startOfQuarter,
  endOfWeek, endOfMonth, endOfQuarter, addDays, addWeeks, addMonths, addQuarters,
  eachDayOfInterval, eachWeekOfInterval, differenceInCalendarDays, isSameDay,
} from "date-fns";

export const ZOOM_LEVELS = ["Day", "Week", "Month", "Quarter"];
export const VIEW_MODES = ["Timeline", "Calendar", "Crew", "List"];

export const PHASE_ORDER = [
  "Measure",
  "Draw",
  "Fabricate",
  "Powder Coat",
  "Install",
];

export const PHASE_SHORT = {
  "Measure":     "Measure",
  "Draw":        "Draw",
  "Fabricate":   "Fabricate",
  "Powder Coat": "Powder Coat",
  "Install":     "Install",
};

export const PHASE_COLORS = {
  "Measure":     { bg: "bg-sky-500",     text: "text-white", light: "bg-sky-100 text-sky-800",         hex: "#0ea5e9" },
  "Draw":        { bg: "bg-purple-500",  text: "text-white", light: "bg-purple-100 text-purple-800",   hex: "#a855f7" },
  "Fabricate":   { bg: "bg-orange-500",  text: "text-white", light: "bg-orange-100 text-orange-800",   hex: "#f97316" },
  "Powder Coat": { bg: "bg-blue-500",    text: "text-white", light: "bg-blue-100 text-blue-800",       hex: "#3b82f6" },
  "Install":     { bg: "bg-emerald-500", text: "text-white", light: "bg-emerald-100 text-emerald-800", hex: "#10b981" },
};

// Fallback for legacy color names and old phase names from stored schedules
export function getPhaseColorByName(colorOrName) {
  if (PHASE_COLORS[colorOrName]) return PHASE_COLORS[colorOrName];
  const legacyMap = {
    // old phase names
    "Measure & Design Approval": PHASE_COLORS["Draw"],
    "Fabrication":               PHASE_COLORS["Fabricate"],
    "Ready for Install":         PHASE_COLORS["Install"],
    "Install Day":               PHASE_COLORS["Install"],
    // old color names
    sky:     PHASE_COLORS["Measure"],
    purple:  PHASE_COLORS["Draw"],
    orange:  PHASE_COLORS["Fabricate"],
    blue:    PHASE_COLORS["Powder Coat"],
    emerald: PHASE_COLORS["Install"],
    lime:    PHASE_COLORS["Install"],
    green:   PHASE_COLORS["Install"],
  };
  return legacyMap[colorOrName] || { bg: "bg-muted", text: "text-foreground", light: "bg-muted text-muted-foreground", hex: "#6b7280" };
}

export function getWindowForZoom(zoom, anchorDate) {
  const d = anchorDate || startOfDay(new Date());
  switch (zoom) {
    case "Day":
      return { start: d, end: d };
    case "Week":
      return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
    case "Month":
      return { start: startOfMonth(d), end: endOfMonth(d) };
    case "Quarter":
      return { start: startOfQuarter(d), end: endOfQuarter(d) };
    default:
      return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
  }
}

export function navigateWindow(zoom, anchorDate, direction) {
  // direction: 1 = forward, -1 = backward
  switch (zoom) {
    case "Day": return addDays(anchorDate, direction);
    case "Week": return addWeeks(anchorDate, direction);
    case "Month": return addMonths(anchorDate, direction);
    case "Quarter": return addQuarters(anchorDate, direction);
    default: return addWeeks(anchorDate, direction);
  }
}

export function getDaysInWindow(start, end) {
  return eachDayOfInterval({ start, end });
}

export function formatWindowLabel(zoom, start, end) {
  switch (zoom) {
    case "Day": return format(start, "EEEE, MMMM d, yyyy");
    case "Week": return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    case "Month": return format(start, "MMMM yyyy");
    case "Quarter": return `Q${Math.ceil((start.getMonth() + 1) / 3)} ${format(start, "yyyy")}`;
    default: return format(start, "MMM d, yyyy");
  }
}

export function buildFabHeatmap(jobs, days) {
  const map = {};
  days.forEach(d => { map[format(d, "yyyy-MM-dd")] = { count: 0, hours: 0 }; });

  jobs.forEach(job => {
    const fabPhase = (job.schedule_phases || []).find(p => p.name === "Fabricate" || p.name === "Fabrication");
    if (!fabPhase) return;
    const s = parseISO(fabPhase.startDate);
    const e = parseISO(fabPhase.endDate);
    const phaseDays = Math.max(1, differenceInCalendarDays(e, s) + 1);
    const totalHours = job.estimated_labor_hours || 8;
    const hoursPerDay = totalHours / phaseDays;

    days.forEach(d => {
      if (d >= s && d <= e) {
        const key = format(d, "yyyy-MM-dd");
        if (map[key] !== undefined) {
          map[key].count++;
          map[key].hours += hoursPerDay;
        }
      }
    });
  });

  return map;
}

export function getHeatColor(hours, capacity = 40) {
  if (hours <= 0) return { bg: "bg-muted", label: "Empty" };
  const ratio = hours / capacity;
  if (ratio > 0.75) return { bg: "bg-red-400", label: "Heavy" };
  if (ratio > 0.4) return { bg: "bg-amber-300", label: "Moderate" };
  return { bg: "bg-emerald-300", label: "Light" };
}

export function jobOverlapsWindow(job, windowStart, windowEnd) {
  if (job.schedule_phases?.length > 0) {
    const first = parseISO(job.schedule_phases[0].startDate);
    const last = parseISO(job.schedule_phases[job.schedule_phases.length - 1].endDate);
    return last >= windowStart && first <= windowEnd;
  }
  const installStr = job.promised_install_date || job.expected_install_date;
  if (installStr) {
    const d = parseISO(installStr);
    return d >= windowStart && d <= windowEnd;
  }
  return false;
}

export function isJobScheduled(job) {
  return !!(job.schedule_phases?.length || job.promised_install_date || job.expected_install_date);
}