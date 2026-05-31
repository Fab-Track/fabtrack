import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import OverviewReport from "@/components/reports/OverviewReport";
import SalesReport from "@/components/reports/SalesReport";
import FinancialReport from "@/components/reports/FinancialReport";
import ProductionReport from "@/components/reports/ProductionReport";
import CustomersReport from "@/components/reports/CustomersReport";

const ALL_TABS = [
  { id: "overview",    label: "Overview",    roles: ["owner", "admin", "user"] },
  { id: "sales",       label: "Sales",       roles: ["owner", "admin", "user", "estimator", "shop_manager"] },
  { id: "financial",   label: "Financial",   roles: ["owner", "admin", "user", "accountant"] },
  { id: "production",  label: "Production",  roles: ["owner", "admin", "user", "shop_manager"] },
  { id: "customers",   label: "Customers",   roles: ["owner", "admin", "user", "estimator", "shop_manager"] },
];

export default function Reports() {
  const { user } = useAuth();
  const role = useEffectiveRole(user?.role || "user");
  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(role));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || "overview");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Business performance dashboards, filterable by date range.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview"   && <OverviewReport onTabChange={setActiveTab} />}
        {activeTab === "sales"      && <SalesReport />}
        {activeTab === "financial"  && <FinancialReport />}
        {activeTab === "production" && <ProductionReport />}
        {activeTab === "customers"  && <CustomersReport />}
      </div>
    </div>
  );
}