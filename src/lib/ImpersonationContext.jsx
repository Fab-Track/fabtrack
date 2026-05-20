import React, { createContext, useContext, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

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

// Roles that CAN impersonate
export function canImpersonate(userRole) {
  return ["admin", "owner", "shop_manager"].includes((userRole || "").toLowerCase());
}

// Which employees a given role can impersonate
export function canImpersonateEmployee(adminRole, employeeRole) {
  const role = (adminRole || "").toLowerCase();
  const empRole = (employeeRole || "").toLowerCase();
  if (["admin", "owner"].includes(role)) return true;
  if (role === "shop_manager") {
    // Shop managers can only impersonate fabricators/installers/field roles
    return ["welder", "fitter", "cutter", "installer", "grinder", "fabricator"].includes(empRole);
  }
  return false;
}