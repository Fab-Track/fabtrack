import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole, usePreviewRole } from "@/lib/PreviewRoleContext";
import { useImpersonation } from "@/lib/ImpersonationContext";
import { getUserRoles, getDashboardForRoles, isOwnerLevel } from "@/lib/roleHelpers";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import CompleteProfileModal from "@/components/profile/CompleteProfileModal";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import DashboardGreeting from "@/components/dashboard/shared/DashboardGreeting";
import OwnerDashboard from "./dashboard/OwnerDashboard";
import ShopManagerDashboard from "./dashboard/ShopManagerDashboard";
import FabricatorDashboard from "./dashboard/FabricatorDashboard";
import EstimatorDashboard from "./dashboard/EstimatorDashboard";
import AccountantDashboard from "./dashboard/AccountantDashboard";
import DesignDashboard from "./dashboard/DesignDashboard";

// Map role → dashboard component key
function getDashboardForRole(role) {
  const r = (role || "").toLowerCase();
  if (["owner", "admin"].includes(r)) return "owner";
  if (r === "shop_manager") return "fabricator";
  if (r === "foreman") return "shop";
  if (r === "estimator") return "estimator";
  if (r === "accountant") return "accountant";
  if (r === "design_specialist") return "design";
  if (["welder", "fitter", "cutter", "grinder", "fabricator", "installer"].includes(r)) return "fabricator";
  return "owner"; // default fallback
}

// Owner/admin can switch between views
const OWNER_VIEWS = [
  { id: "owner",      label: "Command Center" },
  { id: "shop",       label: "Shop" },
  { id: "estimator",  label: "Pipeline" },
  { id: "accountant", label: "Finance" },
];

const STORAGE_KEY = "fabtrack_dashboard_view";

function ViewSwitcher({ activeView, onChange, views }) {
  return (
    <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5 flex-wrap">
      {views.map(v => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
            activeView === v.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const userRoles = getUserRoles(user);
  const effectiveRole = useEffectiveRole(userRoles[0] || "user");
  const { isPreviewing } = usePreviewRole();
  const { isImpersonating, impersonatedEmployee } = useImpersonation();

  const isRealOwner = isOwnerLevel(user);
  const defaultView = getDashboardForRoles(user);
  const isOwnerRole = userRoles.includes("owner");

  const qc = useQueryClient();
  const { data: employee, isLoading: employeeLoading } = useCurrentEmployee();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  const profileIncomplete =
    !!user?.organization_id && !isOwnerRole && !employeeLoading && (!employee || !employee.profile_complete);

  useEffect(() => {
    if (profileIncomplete && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setProfileModalOpen(true);
    }
  }, [profileIncomplete]);

  const handleProfileSaved = () => {
    qc.invalidateQueries({ queryKey: ["currentEmployee"] });
    setProfileModalOpen(false);
  };

  const [activeView, setActiveView] = useState(() => {
    if (!isRealOwner) return defaultView;
    try { return localStorage.getItem(STORAGE_KEY) || defaultView; } catch { return defaultView; }
  });

  // When preview role changes, reset view
  useEffect(() => {
    setActiveView(getDashboardForRole(effectiveRole));
  }, [effectiveRole]);

  const handleViewChange = (view) => {
    setActiveView(view);
    if (!isPreviewing) {
      try { localStorage.setItem(STORAGE_KEY, view); } catch {}
    }
  };

  const impersonationView = isImpersonating ? "fabricator" : null;
  const canSwitchViews = isRealOwner && !isPreviewing && !isImpersonating;
  const displayView = impersonationView || (canSwitchViews ? activeView : defaultView);

  const subtitleMap = {
    owner: "Your business overview — revenue, pipeline, and urgent actions.",
    shop: "Production status — what's in the shop and what's moving.",
    estimator: "Sales pipeline — quotes, approvals, and follow-ups.",
    accountant: "Financial overview — invoices, collections, and cash flow.",
    design: "Drawing queue — what needs to be drafted and when.",
    fabricator: "Your work — what to build, your installs, and your performance.",
  };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {profileIncomplete && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Your profile is incomplete</p>
              <p className="text-xs text-muted-foreground">
                Your shop admin uses this info for scheduling and team management.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setProfileModalOpen(true)}>
            Complete Now
          </Button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <DashboardGreeting user={user} subtitle={subtitleMap[displayView]} />
        {canSwitchViews && (
          <div className="shrink-0">
            <ViewSwitcher activeView={activeView} onChange={handleViewChange} views={OWNER_VIEWS} />
          </div>
        )}
      </div>

      {/* Dashboard content */}
      {displayView === "owner"      && <OwnerDashboard />}
      {displayView === "shop"       && <ShopManagerDashboard />}
      {displayView === "estimator"  && <EstimatorDashboard />}
      {displayView === "accountant" && <AccountantDashboard />}
      {displayView === "design"     && <DesignDashboard />}
      {displayView === "fabricator" && (
        <FabricatorDashboard overrideEmployee={isImpersonating ? impersonatedEmployee : null} />
      )}

      {!isOwnerRole && (
        <CompleteProfileModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          employee={employee}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  );
}