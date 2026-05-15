import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import OwnerDashboard from "./dashboard/OwnerDashboard";
import ShopManagerDashboard from "./dashboard/ShopManagerDashboard";

// Views available to owners — other roles see their own view directly
const OWNER_VIEWS = [
  { id: "owner",   label: "Command Center" },
  { id: "shop",    label: "Shop Performance" },
];

const STORAGE_KEY = "fabtrack_dashboard_view";

function ViewSwitcher({ activeView, onChange }) {
  return (
    <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
      {OWNER_VIEWS.map(v => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
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

function getDashboardForRole(role) {
  const r = (role || "").toLowerCase();
  if (r === "owner" || r === "admin") return "owner";
  if (r === "shop_manager") return "shop";
  return "owner"; // default fallback
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role || "owner";
  const isOwner = ["owner", "admin"].includes(role.toLowerCase());

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

  // Non-owner roles: fixed view
  const displayView = isOwner ? activeView : defaultView;

  const viewLabel = OWNER_VIEWS.find(v => v.id === displayView)?.label || "Dashboard";
  const subLabel = isOwner ? "Command Center" : role.replace(/_/g, " ");

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
          <ViewSwitcher activeView={activeView} onChange={handleViewChange} />
        )}
      </div>

      {/* Dashboard content */}
      {displayView === "owner" && <OwnerDashboard />}
      {displayView === "shop" && <ShopManagerDashboard />}
    </div>
  );
}