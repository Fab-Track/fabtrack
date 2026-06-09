import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Building2, Users, Bell, MessageSquare, Plug, LayoutDashboard, CreditCard, User, ClipboardList } from "lucide-react";
import CompanySection from "@/components/settings/CompanySection";
import UsersRolesSection from "@/components/settings/UsersRolesSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import MessageTemplatesSection from "@/components/settings/MessageTemplatesSection";
import IntegrationsSection from "@/components/settings/IntegrationsSection";
import JobBoardSettingsSection from "@/components/settings/JobBoardSettingsSection";
import BillingSection from "@/components/settings/BillingSection";
import MyAccountSection from "@/components/settings/MyAccountSection";
import ServiceCatalogSection from "@/components/settings/ServiceCatalogSection";
import AdminActivityLogSection from "@/components/settings/AdminActivityLogSection";
import { BookOpen, Activity, DollarSign, Image } from "lucide-react";

// All settings nav items — visibility controlled per role below
const ALL_SECTIONS = [
  { id: "company",    label: "Company",             icon: Building2,       ownerOnly: true },
  { id: "users",      label: "Users & Roles",        icon: Users,           ownerOnly: true },
  { id: "notifications", label: "Notifications",    icon: Bell,            roles: ["owner","admin","shop_manager","estimator","fabricator","accountant"] },
  { id: "templates",  label: "Message Templates",    icon: MessageSquare,   roles: ["owner","admin","estimator"] },
  { id: "integrations", label: "Integrations",      icon: Plug,            ownerOnly: true },
  { id: "jobboard",   label: "Job Board",            icon: LayoutDashboard, roles: ["owner","admin","shop_manager"] },
  { id: "catalog",    label: "Service Catalog",      icon: BookOpen,        ownerOnly: true },
  { id: "contracts",  label: "Estimate Contracts",   icon: ClipboardList,   ownerOnly: true },
  { id: "styles",     label: "Style Library",        icon: Image,           ownerOnly: true },
  { id: "materials",  label: "Materials",            icon: DollarSign,      ownerOnly: true },
  { id: "billing",    label: "Billing",              icon: CreditCard,      ownerOnly: true },
  { id: "activity",   label: "Activity Log",         icon: Activity,        ownerOnly: true },
  { id: "account",    label: "My Account",           icon: User,            roles: ["owner","admin","shop_manager","estimator","fabricator","installer","accountant"] },
];

// Style & Materials sub-sections (kept from old settings page)
import StyleLibrarySection from "@/components/settings/StyleLibrarySection";
import MaterialsPriceSection from "@/components/settings/MaterialsPriceSection";
import EstimateContractSection from "@/components/settings/EstimateContractSection";

export default function Settings() {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isOwner = ["admin", "owner"].includes(role);

  // Filter sections by role
  const visible = ALL_SECTIONS.filter(s => {
    if (s.ownerOnly) return isOwner;
    if (s.roles) return s.roles.includes(role);
    return false;
  });

  const [active, setActive] = useState(visible[0]?.id || "account");

  function renderSection() {
    switch (active) {
      case "company":      return <CompanySection />;
      case "users":        return <UsersRolesSection />;
      case "notifications":return <NotificationsSection isOwner={isOwner} userRole={role} />;
      case "templates":    return <MessageTemplatesSection />;
      case "integrations": return <IntegrationsSection />;
      case "jobboard":     return <JobBoardSettingsSection />;
      case "catalog":      return <ServiceCatalogSection />;
      case "contracts":    return <EstimateContractSection />;
      case "styles":       return <StyleLibrarySection />;
      case "materials":    return <MaterialsPriceSection />;
      case "billing":      return <BillingSection />;
      case "activity":     return <AdminActivityLogSection />;
      case "account":      return <MyAccountSection />;
      default:             return null;
    }
  }

  return (
    <div className="flex h-full min-h-screen bg-background">
      {/* Left sub-nav */}
      <aside className="w-52 shrink-0 border-r bg-muted/20 flex flex-col py-4">
        <div className="px-4 mb-4">
          <h1 className="text-base font-bold tracking-tight">Settings</h1>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {visible.map(s => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-[900px]">
          {renderSection()}
        </div>
      </main>
    </div>
  );
}