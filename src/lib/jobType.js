/**
 * Normalizes a job's job_type field to an array of strings.
 * Handles both legacy string values and new array values.
 */
export function getJobTypes(job) {
  const jt = job?.job_type;
  if (!jt) return [];
  return Array.isArray(jt) ? jt : [jt];
}

/**
 * Returns true if the job includes the given type.
 */
export function hasJobType(job, type) {
  return getJobTypes(job).includes(type);
}

/**
 * Returns a comma-separated string of job types for display.
 */
export function jobTypeLabel(job) {
  const types = getJobTypes(job);
  return types.length ? types.join(", ") : "";
}