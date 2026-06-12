// Persists manual drag priority for design queues in localStorage
// Keys: design_measure_priority, design_drawing_priority
// Value: JSON array of job IDs in priority order

const MEASURE_KEY = "design_measure_priority";
const DRAWING_KEY = "design_drawing_priority";

function loadOrder(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveOrder(key, ids) {
  localStorage.setItem(key, JSON.stringify(ids));
}

export function getMeasureOrder() { return loadOrder(MEASURE_KEY); }
export function getDrawingOrder() { return loadOrder(DRAWING_KEY); }
export function saveMeasureOrder(ids) { saveOrder(MEASURE_KEY, ids); }
export function saveDrawingOrder(ids) { saveOrder(DRAWING_KEY, ids); }

/**
 * Apply a stored priority order to a list of jobs.
 * Jobs with a manual position come first (in order), then remaining sorted by date.
 * Returns { sorted, manualIds } — manualIds is the Set of job IDs that were manually positioned.
 */
export function applyPriority(jobs, storedOrder) {
  const manualIds = new Set(storedOrder);
  const inOrder = [];
  const rest = [];
  // First, place manually-ordered jobs that still exist
  for (const id of storedOrder) {
    const job = jobs.find(j => j.id === id);
    if (job) inOrder.push(job);
  }
  // Then, jobs not in the manual order, sorted by schedule date (soonest first)
  for (const job of jobs) {
    if (!manualIds.has(job.id)) rest.push(job);
  }
  rest.sort((a, b) => {
    const da = getJobDate(a);
    const db = getJobDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
  return { sorted: [...inOrder, ...rest], manualIds };
}

function getJobDate(job) {
  const dateStr = job.promised_install_date || job.expected_install_date;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}