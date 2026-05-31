import React, { createContext, useContext, useState } from "react";

export const PREVIEW_ROLES = [
  { id: "owner",            label: "Owner",                    dashboardView: "owner" },
  { id: "admin",            label: "Owner",                    dashboardView: "owner" },
  { id: "shop_manager",     label: "Shop Manager",             dashboardView: "shop" },
  { id: "estimator",        label: "Estimator",                dashboardView: "estimator" },
  { id: "design_specialist",label: "Design Specialist",        dashboardView: "owner" },
  { id: "fabricator",       label: "Fabricator",               dashboardView: "fabricator" },
  { id: "installer",        label: "Fabricator",               dashboardView: "fabricator" },
  { id: "accountant",       label: "Accountant",               dashboardView: "estimator" },
];

export const PREVIEW_ROLE_OPTIONS = [
  { id: "owner",             label: "Owner" },
  { id: "shop_manager",      label: "Shop Manager" },
  { id: "estimator",         label: "Estimator" },
  { id: "design_specialist", label: "Design Specialist (Drawer)" },
  { id: "fabricator",        label: "Fabricator" },
  { id: "accountant",        label: "Accountant" },
];

const PreviewRoleContext = createContext(null);

export function PreviewRoleProvider({ children }) {
  const [previewRole, setPreviewRole] = useState(null); // null = not previewing

  const startPreview = (roleId) => setPreviewRole(roleId);
  const exitPreview = () => setPreviewRole(null);
  const isPreviewing = previewRole !== null;

  const getRoleLabel = (roleId) => {
    const r = PREVIEW_ROLE_OPTIONS.find(r => r.id === roleId);
    return r?.label || roleId;
  };

  return (
    <PreviewRoleContext.Provider value={{ previewRole, startPreview, exitPreview, isPreviewing, getRoleLabel }}>
      {children}
    </PreviewRoleContext.Provider>
  );
}

export function usePreviewRole() {
  const ctx = useContext(PreviewRoleContext);
  if (!ctx) throw new Error("usePreviewRole must be used within PreviewRoleProvider");
  return ctx;
}

/**
 * Returns the effective role to use for nav/dashboard/permissions.
 * When in preview mode, returns the preview role. Otherwise returns the real user role.
 */
export function useEffectiveRole(realRole) {
  const { previewRole, isPreviewing } = usePreviewRole();
  return isPreviewing ? previewRole : (realRole || "user");
}