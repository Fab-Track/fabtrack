import React, { createContext, useContext, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getUserRoles, hasAnyRole } from "@/lib/roleHelpers";

const ImpersonationContext = createContext(null);

export function ImpersonationProvider({ children }) {
  const [impersonatedEmployee, setImpersonatedEmployee] = useState(null); // { id, name, role, ... }
  const [adminUser, setAdminUser] = useState(null); // the real user performing impersonation

  const startImpersonation = useCallback(async (employee, currentUser) => {
    setImpersonatedEmployee(employee);
    setAdminUser(currentUser);
    // Log start
    await base44.entities.AdminActivityLog.create({
      admin_user_email: currentUser?.email || "",
      admin_user_name: currentUser?.full_name || currentUser?.email || "",
      impersonated_employee_id: employee.id,
      impersonated_employee_name: employee.name,
      action_type: "impersonation_started",
      action_detail: `Started viewing as ${employee.name} (${employee.role || "employee"})`,
    });
  }, []);

  const exitImpersonation = useCallback(async () => {
    if (impersonatedEmployee && adminUser) {
      await base44.entities.AdminActivityLog.create({
        admin_user_email: adminUser?.email || "",
        admin_user_name: adminUser?.full_name || adminUser?.email || "",
        impersonated_employee_id: impersonatedEmployee.id,
        impersonated_employee_name: impersonatedEmployee.name,
        action_type: "impersonation_ended",
        action_detail: `Ended viewing as ${impersonatedEmployee.name}`,
      });
    }
    setImpersonatedEmployee(null);
    setAdminUser(null);
  }, [impersonatedEmployee, adminUser]);

  const logAction = useCallback(async ({ actionType, actionDetail, metadata }) => {
    if (!impersonatedEmployee || !adminUser) return;
    await base44.entities.AdminActivityLog.create({
      admin_user_email: adminUser?.email || "",
      admin_user_name: adminUser?.full_name || adminUser?.email || "",
      impersonated_employee_id: impersonatedEmployee.id,
      impersonated_employee_name: impersonatedEmployee.name,
      action_type: actionType,
      action_detail: actionDetail,
      metadata: metadata || {},
    });
  }, [impersonatedEmployee, adminUser]);

  const isImpersonating = impersonatedEmployee !== null;

  return (
    <ImpersonationContext.Provider value={{
      impersonatedEmployee,
      adminUser,
      isImpersonating,
      startImpersonation,
      exitImpersonation,
      logAction,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
}

// Roles that CAN impersonate (accepts user object or string)
export function canImpersonate(userOrRole) {
  if (!userOrRole) return false;
  if (typeof userOrRole === "object") {
    return hasAnyRole(userOrRole, ["admin", "owner", "shop_manager"]);
  }
  return ["admin", "owner", "shop_manager"].includes((userOrRole || "").toLowerCase());
}

// Which employees a given role can impersonate (accepts user object or string)
export function canImpersonateEmployee(adminInfo, employeeRole) {
  const isOwnerLevel = typeof adminInfo === "object"
    ? hasAnyRole(adminInfo, ["admin", "owner"])
    : ["admin", "owner"].includes((adminInfo || "").toLowerCase());
  if (isOwnerLevel) return true;

  const effRole = typeof adminInfo === "object"
    ? getUserRoles(adminInfo)[0] || ""
    : (adminInfo || "").toLowerCase();
  const empRole = (employeeRole || "").toLowerCase();
  if (effRole === "shop_manager") {
    return ["welder", "fitter", "cutter", "installer", "grinder", "fabricator"].includes(empRole);
  }
  return false;
}