import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import FinancialReports from "@/components/reports/FinancialReports";
import ProductionReports from "@/components/reports/ProductionReports";
import SalesReports from "@/components/reports/SalesReports";
import TeamReports from "@/components/reports/TeamReports";

const ROLE_TABS = {
  admin:          ["financial", "production", "sales", "team"],
  shop_manager:   ["financial", "production", "sales", "team"],
  estimator:      ["financial", "sales"],
  accountant:     ["financial"],
  user:           ["financial", "production", "sales", "team"],
};

export default function Reports() {
  const { user } = useAuth();
  const role = useEffectiveRole(user?.role || "user");
  const allowedTabs = ROLE_TABS[role] || ROLE_TABS.user;
  const [activeTab, setActiveTab] = useState(allowedTabs[0]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Deep data analysis, exports, and date-range filtering</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {allowedTabs.includes("financial")   && <TabsTrigger value="financial">Financial</TabsTrigger>}
          {allowedTabs.includes("production")  && <TabsTrigger value="production">Production</TabsTrigger>}
          {allowedTabs.includes("sales")       && <TabsTrigger value="sales">Sales</TabsTrigger>}
          {allowedTabs.includes("team")        && <TabsTrigger value="team">Team</TabsTrigger>}
        </TabsList>

        <TabsContent value="financial"  className="mt-6"><FinancialReports /></TabsContent>
        <TabsContent value="production" className="mt-6"><ProductionReports /></TabsContent>
        <TabsContent value="sales"      className="mt-6"><SalesReports /></TabsContent>
        <TabsContent value="team"       className="mt-6"><TeamReports /></TabsContent>
      </Tabs>
    </div>
  );
}