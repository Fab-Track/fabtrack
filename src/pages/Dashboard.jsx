import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import OwnerDashboard from "./dashboard/OwnerDashboard";
import ShopManagerDashboard from "./dashboard/ShopManagerDashboard";
import FabricatorDashboard from "./dashboard/FabricatorDashboard";
import EstimatorDashboard from "./dashboard/EstimatorDashboard";

const ALL_VIEWS = [
  { id: "owner",      label: "Command Center" },
  { id: "shop",       label: "Shop Performance" },
  { id: "fabricator", label: "My Work" },
  { id: "estimator",  label: "Pipeline" },
];

const STORAGE_KEY = "fabtrack_dashboard_view";

// Roles that can toggle between views (owner sees all 4)
const OWNER_ROLES = ["owner", "admin"];

function getDashboardForRole(role) {
  const r = (role || "").toLowerCase();
  if (OWNER_ROLES.includes(r)) return "owner";
  if (r === "shop_manager" || r === "foreman") return "shop";
  if (["welder", "fitter", "cutter", "installer", "grinder"].includes(r)) return "fabricator";
  if (r === "estimator") return "estimator";
  return "owner";
}

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

const VIEW_LABELS = {
  owner:      "Command Center",
  shop:       "Shop Performance",
  fabricator: "My Work",
  estimator:  "Pipeline",
};

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || "owner";
  const isOwner = OWNER_ROLES.includes(role.toLowerCase());

  const defaultView = getDashboardForRole(role);

  const [activeView, setActiveView] = useState(() => {
    if (!isOwner) return defaultView;
    try {
      return localStorage.getItem(STORAGE_KEY) || defaultView;
    } catch {
      return defaultView;
    }
  });

  const handleViewChange = (view) => {
    setActiveView(view);
    try { localStorage.setItem(STORAGE_KEY, view); } catch {}
  };

  const displayView = isOwner ? activeView : defaultView;
  const viewLabel = VIEW_LABELS[displayView] || "Dashboard";

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{viewLabel}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        {isOwner && (
          <ViewSwitcher activeView={activeView} onChange={handleViewChange} views={ALL_VIEWS} />
        )}
      </div>

      {/* Dashboard content */}
      {displayView === "owner"      && <OwnerDashboard />}
      {displayView === "shop"       && <ShopManagerDashboard />}
      {displayView === "fabricator" && <FabricatorDashboard />}
      {displayView === "estimator"  && <EstimatorDashboard />}
    </div>
  );
}