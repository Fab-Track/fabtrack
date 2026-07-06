/**
 * Multi-role helper utilities.
 *
 * Migration path:
 * - Old users have `role` (string). New users have `roles` (array).
 * - getUserRoles(user) normalizes both: single-role users are treated as [role].
 * - hasRole(user, role) checks membership in the normalized array.
 * - Every place that used `user.role === "something"` should now use hasRole(user, "something").
 */

/** All valid app roles (mirrors User entity enum) */
export const ALL_ROLES = [
  "owner",
  "admin",
  "manager",
  "shop_manager",
  "estimator",
  "fabricator",
  "installer",
  "accountant",
  "design_specialist",
  "payroll",
];

/** Roles that count as owner-level (full access) */
export const OWNER_LEVEL_ROLES = ["owner", "admin", "manager", "super_admin"];

/** Roles that have payroll access (approve, export, corrections) */
export const PAYROLL_ROLES = ["owner", "admin", "payroll"];

/**
 * Normalize user roles to an array.
 * Old single-role users have `role` (string); new users have `roles` (array).
 */
export function getUserRoles(user) {
  if (!user) return [];
  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.map(r => r.toLowerCase());
  }
  if (user.role) return [user.role.toLowerCase()];
  return [];
}

/** Check if user holds a specific role */
export function hasRole(user, role) {
  return getUserRoles(user).includes(role.toLowerCase());
}

/** Check if user holds any of the given roles */
export function hasAnyRole(user, roles) {
  const userRoles = getUserRoles(user);
  return roles.some(r => userRoles.includes(r.toLowerCase()));
}

/** Check if user holds all of the given roles */
export function hasAllRoles(user, roles) {
  const userRoles = getUserRoles(user);
  return roles.every(r => userRoles.includes(r.toLowerCase()));
}

/** Check if user holds owner-level access */
export function isOwnerLevel(user) {
  return hasAnyRole(user, OWNER_LEVEL_ROLES);
}

/** Check if user has payroll access */
export function hasPayrollAccess(user) {
  return hasAnyRole(user, PAYROLL_ROLES);
}

/**
 * Returns the primary dashboard view for a set of roles.
 * owner/admin always gets "owner" dashboard. Otherwise returns the first
 * matching non-owner role's dashboard.
 */
export function getDashboardForRoles(user) {
  const roles = getUserRoles(user);
  if (roles.length === 0) return "owner";
  if (roles.some(r => OWNER_LEVEL_ROLES.includes(r))) return "owner";
  const r = roles[0];
  if (["shop_manager", "foreman", "manager"].includes(r)) return "owner";
  if (["shop_manager", "foreman"].includes(r)) return "shop";
  if (r === "estimator") return "estimator";
  if (r === "accountant" || r === "payroll") return "accountant";
  if (r === "design_specialist") return "design";
  if (["welder", "fitter", "cutter", "grinder", "fabricator", "installer"].includes(r)) return "fabricator";
  return "owner";
}