import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  parseISO, format, differenceInSeconds, addDays,
  isSameDay, isWithinInterval, getDate, getMonth, getYear,
  setDate, addMonths
} from "date-fns";

// ─── Pay Period ────────────────────────────────────────────────────────────────
// Semi-monthly: 1st-15th and 16th-EOM
export function getPayPeriod(date = new Date()) {
  const d = typeof date === "string" ? parseISO(date) : date;
  const day = getDate(d);
  const year = getYear(d);
  const month = getMonth(d); // 0-indexed

  if (day <= 15) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month, 15);
    return {
      start,
      end,
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
      key: `${format(start, "yyyy-MM-dd")}_${format(end, "yyyy-MM-dd")}`,
    };
  } else {
    const start = new Date(year, month, 16);
    // Last day of month
    const end = new Date(year, month + 1, 0);
    return {
      start,
      end,
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
      key: `${format(start, "yyyy-MM-dd")}_${format(end, "yyyy-MM-dd")}`,
    };
  }
}

export function getCurrentPayPeriod() {
  return getPayPeriod(new Date());
}

export function getPreviousPayPeriod() {
  const now = new Date();
  const day = getDate(now);
  if (day <= 15) {
    // Previous period: 16th-EOM of prior month
    const prevMonth = addMonths(now, -1);
    const year = getYear(prevMonth);
    const month = getMonth(prevMonth);
    const start = new Date(year, month, 16);
    const end = new Date(year, month + 1, 0);
    return {
      start, end,
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
      key: `${format(start, "yyyy-MM-dd")}_${format(end, "yyyy-MM-dd")}`,
    };
  } else {
    // Previous period: 1st-15th of this month
    const year = getYear(now);
    const month = getMonth(now);
    const start = new Date(year, month, 1);
    const end = new Date(year, month, 15);
    return {
      start, end,
      label: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
      key: `${format(start, "yyyy-MM-dd")}_${format(end, "yyyy-MM-dd")}`,
    };
  }
}

// ─── Workweek ──────────────────────────────────────────────────────────────────
export function getWorkweekStart(date = new Date(), weekStartsOn = 1) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return startOfWeek(d, { weekStartsOn });
}

export function getWorkweekEnd(date = new Date(), weekStartsOn = 1) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return endOfWeek(d, { weekStartsOn });
}

// ─── Hours Calculations ───────────────────────────────────────────────────────
// Returns worked hours for a shift entry (net of any recorded breaks)
export function getNetHours(entry) {
  if (!entry) return 0;
  if (entry.net_hours != null) return entry.net_hours;
  if (entry.duration_hours != null) {
    const breakHours = (entry.break_minutes || 0) / 60;
    return Math.max(0, entry.duration_hours - breakHours);
  }
  return 0;
}

// For an ACTIVE entry, compute live elapsed worked seconds (excluding current break if on break)
export function getLiveElapsedSeconds(entry) {
  if (!entry || !entry.is_active || !entry.clock_in) return 0;
  const clockInTime = parseISO(entry.clock_in);
  const totalSecs = Math.max(0, differenceInSeconds(new Date(), clockInTime));

  // Subtract accumulated break minutes
  const breakSecs = (entry.break_minutes || 0) * 60;

  // Subtract ongoing break duration if currently on break
  let ongoingBreakSecs = 0;
  if (entry.is_on_break && entry.break_start) {
    ongoingBreakSecs = Math.max(0, differenceInSeconds(new Date(), parseISO(entry.break_start)));
  }

  return Math.max(0, totalSecs - breakSecs - ongoingBreakSecs);
}

// Aggregate completed shift entries for an employee
export function aggregateHours(entries, employeeId) {
  const mine = entries.filter(
    e => e.employee_id === employeeId && !e.is_active && (e.entry_type === "shift" || !e.entry_type)
  );

  const now = new Date();
  const todayStart = startOfDay(now);
  const pp = getCurrentPayPeriod();
  const weekStart = getWorkweekStart(now, 1);

  const today = mine
    .filter(e => e.clock_in && parseISO(e.clock_in) >= todayStart)
    .reduce((s, e) => s + getNetHours(e), 0);

  const week = mine
    .filter(e => e.clock_in && parseISO(e.clock_in) >= weekStart)
    .reduce((s, e) => s + getNetHours(e), 0);

  const payPeriod = mine
    .filter(e => {
      if (!e.clock_in) return false;
      const d = parseISO(e.clock_in);
      return d >= pp.start && d <= endOfDay(pp.end);
    })
    .reduce((s, e) => s + getNetHours(e), 0);

  return { today, week, payPeriod };
}

// ─── Overtime (FLSA weekly: >40h = OT) ────────────────────────────────────────
export function calcOvertimeForWeek(entries, employeeId, weekStart, weekStartsOn = 1) {
  const wEnd = endOfWeek(weekStart, { weekStartsOn });
  const mine = entries.filter(
    e =>
      e.employee_id === employeeId &&
      !e.is_active &&
      (e.entry_type === "shift" || !e.entry_type) &&
      e.clock_in &&
      parseISO(e.clock_in) >= weekStart &&
      parseISO(e.clock_in) <= wEnd
  );

  const totalHours = mine.reduce((s, e) => s + getNetHours(e), 0);
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);
  return { totalHours, regularHours, overtimeHours };
}

// Group entries by workweek for a given employee over a pay period
export function groupByWorkweek(entries, employeeId, periodStart, periodEnd, weekStartsOn = 1) {
  const mine = entries.filter(
    e =>
      e.employee_id === employeeId &&
      !e.is_active &&
      (e.entry_type === "shift" || !e.entry_type) &&
      e.clock_in
  );

  const weeks = {};

  mine.forEach(e => {
    const d = parseISO(e.clock_in);
    const ws = startOfWeek(d, { weekStartsOn });
    const key = format(ws, "yyyy-MM-dd");
    if (!weeks[key]) weeks[key] = { weekStart: ws, entries: [] };
    weeks[key].entries.push(e);
  });

  return Object.values(weeks)
    .sort((a, b) => a.weekStart - b.weekStart)
    .map(w => {
      const totalHours = w.entries.reduce((s, e) => s + getNetHours(e), 0);
      return {
        weekStart: w.weekStart,
        weekEnd: endOfWeek(w.weekStart, { weekStartsOn }),
        entries: w.entries,
        totalHours,
        regularHours: Math.min(totalHours, 40),
        overtimeHours: Math.max(0, totalHours - 40),
      };
    });
}

// Group daily hours from entries
export function groupByDay(entries, employeeId) {
  const mine = entries.filter(
    e =>
      e.employee_id === employeeId &&
      !e.is_active &&
      (e.entry_type === "shift" || !e.entry_type) &&
      e.clock_in
  );

  const days = {};
  mine.forEach(e => {
    const key = format(parseISO(e.clock_in), "yyyy-MM-dd");
    if (!days[key]) days[key] = { date: parseISO(e.clock_in), entries: [] };
    days[key].entries.push(e);
  });

  return Object.entries(days)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, val]) => ({
      dateKey: key,
      date: val.date,
      entries: val.entries,
      totalHours: val.entries.reduce((s, e) => s + getNetHours(e), 0),
    }));
}

// ─── Status Label ──────────────────────────────────────────────────────────────
export function getClockStatus(activeEntry) {
  if (!activeEntry) return { label: "Clocked Out", color: "text-muted-foreground", bg: "bg-muted" };
  if (activeEntry.is_on_break) {
    const isLunch = activeEntry.break_type === "lunch";
    return {
      label: isLunch ? "On Lunch" : "On Break",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      icon: "pause",
    };
  }
  return {
    label: `Clocked In since ${format(parseISO(activeEntry.clock_in), "h:mm a")}`,
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: "active",
  };
}

// Format seconds as "Xh Ym"
export function formatHMS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatHours(h) {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Build payroll key metadata
export function payPeriodLabel(date) {
  return getPayPeriod(date).key;
}