// Role guardrails for the Shop Assistant.
// One place that decides what each FabTrack role may do through the assistant.
// Used by every assistant backend function so the rules cannot be bypassed in the UI.

const FULL = {
  production: true,
  finance: true,
  estimating: true,
  jobUpdates: true,
  knowledge: true,
};

const NO = {
  production: false,
  finance: false,
  estimating: false,
  jobUpdates: false,
  knowledge: false,
};

// Owner / admin: everything.
// Estimator: sales, customers, estimating, invoices (view-level), job updates.
// Shop manager: jobs and production, may stage job updates, no money.
// Design / fabricator / installer: job and production context only.
// Accountant: invoices and financial context only.
// Anything else (payroll, welder, unknown): no assistant at all.
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

/** Returns the merged capability flags, or null when this user has no assistant access. */
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

export function canUse(user, capability) {
  const access = assistantAccess(user);
  return !!(access && access[capability]);
}

export function forbidden(message = "Your role does not have access to this part of the assistant.") {
  return Response.json({ error: message }, { status: 403 });
}