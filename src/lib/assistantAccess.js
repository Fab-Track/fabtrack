// Frontend mirror of base44/shared/assistantAccess.js — used to show or hide the
// Shop Assistant and its capability cards. The backend checks are the real gate.

const FULL = { production: true, finance: true, estimating: true, jobUpdates: true, knowledge: true };
const NO = { production: false, finance: false, estimating: false, jobUpdates: false, knowledge: false };

const BY_ROLE = {
  owner: FULL,
  admin: FULL,
  manager: FULL,
  super_admin: FULL,
  estimator: { ...FULL },
  shop_manager: { ...NO, production: true, jobUpdates: true },
  design_specialist: { ...NO, production: true },
  fabricator: { ...NO, production: true },
  installer: { ...NO, production: true },
  accountant: { ...NO, finance: true },
};

export function rolesOf(user) {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length) {
    return user.roles.map((r) => String(r).toLowerCase());
  }
  if (user.role) return [String(user.role).toLowerCase()];
  return [];
}

export function assistantAccess(user) {
  const flags = { ...NO };
  let allowed = false;
  rolesOf(user).forEach((role) => {
    const caps = BY_ROLE[role];
    if (!caps) return;
    allowed = true;
    Object.keys(flags).forEach((key) => {
      if (caps[key]) flags[key] = true;
    });
  });
  return allowed ? flags : null;
}

export function primaryAssistantRole(user) {
  const roles = rolesOf(user);
  return roles[0] || "unknown";
}