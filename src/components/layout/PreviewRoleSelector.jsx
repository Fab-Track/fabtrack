import React, { useState, useRef, useEffect } from "react";
import { Eye, X, ChevronRight, UserCheck } from "lucide-react";
import { usePreviewRole, PREVIEW_ROLE_OPTIONS } from "@/lib/PreviewRoleContext";
import { useImpersonation, canImpersonate, canImpersonateEmployee } from "@/lib/ImpersonationContext";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function PreviewRoleSelector({ collapsed }) {
  const { isPreviewing, previewRole, startPreview, exitPreview, getRoleLabel } = usePreviewRole();
  const { isImpersonating, impersonatedEmployee, startImpersonation, exitImpersonation } = useImpersonation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
    enabled: open && canImpersonate(user?.role),
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelectRole = (roleId) => {
    startPreview(roleId);
    setOpen(false);
  };

  const handleImpersonate = (emp) => {
    startImpersonation(emp, user);
    setOpen(false);
  };

  const handleExit = (e) => {
    e.stopPropagation();
    if (isImpersonating) exitImpersonation();
    else exitPreview();
  };

  const activeLabel = isImpersonating
    ? impersonatedEmployee.name
    : isPreviewing
      ? getRoleLabel(previewRole)
      : null;

  const isActive = isImpersonating || isPreviewing;
  const userCanImpersonate = canImpersonate(user?.role);

  // Only show employees that this user can impersonate
  const impersonatableEmployees = employees.filter(e =>
    e.is_active !== false &&
    canImpersonateEmployee(user?.role, e.role)
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={collapsed ? "Preview Role / View As Employee" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full transition-colors",
          isActive
            ? "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        {isImpersonating ? (
          <UserCheck className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
        ) : (
          <Eye className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
        )}
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">
              {activeLabel ? `As: ${activeLabel}` : "Preview Role"}
            </span>
            {isActive && (
              <span onClick={handleExit} className="text-amber-300/70 hover:text-amber-300">
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div className={cn(
          "absolute bottom-full mb-2 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden",
          collapsed ? "left-14 w-64" : "left-0 w-64"
        )}>
          {/* Role Preview Section */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview as Role</p>
          </div>
          <div className="py-1">
            {PREVIEW_ROLE_OPTIONS.map(role => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted",
                  isPreviewing && previewRole === role.id && !isImpersonating
                    ? "bg-amber-50 text-amber-700 font-semibold"
                    : "text-foreground"
                )}
              >
                {role.label}
                {isPreviewing && previewRole === role.id && !isImpersonating && (
                  <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                )}
              </button>
            ))}
          </div>

          {/* Employee Impersonation Section */}
          {userCanImpersonate && impersonatableEmployees.length > 0 && (
            <>
              <div className="px-3 py-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> View as Employee
                </p>
              </div>
              <div className="py-1 max-h-48 overflow-y-auto">
                {impersonatableEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleImpersonate(emp)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted",
                      isImpersonating && impersonatedEmployee?.id === emp.id
                        ? "bg-amber-50 text-amber-700 font-semibold"
                        : "text-foreground"
                    )}
                  >
                    <div className="text-left">
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{emp.role?.replace(/_/g, " ")}</p>
                    </div>
                    {isImpersonating && impersonatedEmployee?.id === emp.id && (
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {isActive && (
            <div className="px-3 py-2 border-t border-border">
              <button
                onClick={() => { if (isImpersonating) exitImpersonation(); else exitPreview(); setOpen(false); }}
                className="w-full text-xs text-destructive hover:text-destructive/80 font-semibold py-1 text-center transition-colors"
              >
                Exit {isImpersonating ? "Employee View" : "Preview Mode"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}