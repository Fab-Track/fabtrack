import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getUserRoles, isOwnerLevel } from "@/lib/roleHelpers";
import {
  Building2, Users, Bell, MessageSquare, Plug, LayoutDashboard, CreditCard,
  Shield, UserPlus, Calculator, BookOpen, Activity,
  Timer, Paperclip, ListChecks, Globe, ChevronDown, FileText, Search
} from "lucide-react";
import CompanySection from "@/components/settings/CompanySection";
import UsersRolesSection from "@/components/settings/UsersRolesSection";
import EmployeeInviteSection from "@/components/settings/EmployeeInviteSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import MessageTemplatesSection from "@/components/settings/MessageTemplatesSection";
import IntegrationsSection from "@/components/settings/IntegrationsSection";
import JobBoardSettingsSection from "@/components/settings/JobBoardSettingsSection";
import BillingSection from "@/components/settings/BillingSection";
import ServiceCatalogSection from "@/components/settings/ServiceCatalogSection";
import AdminActivityLogSection from "@/components/settings/AdminActivityLogSection";
import JobCostingSection from "@/components/settings/JobCostingSection";
import AttachmentCategoriesSection from "@/components/settings/AttachmentCategoriesSection";
import StripeSettingsSection from "@/components/settings/StripeSettingsSection";
import JobDetailOptionsSection from "@/components/settings/JobDetailOptionsSection";
import GHLLeadWebhookSection from "@/components/settings/GHLLeadWebhookSection";
import QuickBooksSection from "@/components/settings/QuickBooksSection";
import DocumentTemplatesSection from "@/components/settings/DocumentTemplatesSection";
import SecuritySection from "@/components/settings/SecuritySection";
import PayrollSettingsSection from "@/components/settings/PayrollSettingsSection";
import { Input } from "@/components/ui/input";

// All settings items — visibility controlled per role below
const ALL_ITEMS = [
  { id: "company",      label: "Company Profile",       icon: Building2,       ownerOnly: true,  group: "company" },
  { id: "users",        label: "Users & Roles",          icon: Users,           ownerOnly: true,  group: "company" },
  { id: "employees",    label: "Employees",              icon: UserPlus,        ownerOnly: true,  group: "company" },
  { id: "security",     label: "Security",               icon: Shield,          ownerOnly: true,  group: "company" },

  { id: "catalog",      label: "Service Catalog",        icon: BookOpen,        ownerOnly: true,  group: "sales" },
  { id: "job_costing",  label: "Job Costing",            icon: Calculator,      ownerOnly: true,  group: "sales" },
  { id: "contracts",    label: "Document Templates",     icon: FileText,        ownerOnly: true,  group: "sales" },

  { id: "jobboard",     label: "Job Board",              icon: LayoutDashboard, roles: ["owner","admin","shop_manager"], group: "production" },
  { id: "jobdetail",    label: "Job Detail Options",     icon: ListChecks,      ownerOnly: true,  group: "production" },
  { id: "attachments",  label: "Attachment Categories",  icon: Paperclip,       ownerOnly: true,  group: "production" },

  { id: "notifications", label: "Notifications",         icon: Bell,            roles: ["owner","admin","shop_manager","estimator","fabricator","accountant"], group: "comms" },
  { id: "templates",    label: "Message Templates",      icon: MessageSquare,   roles: ["owner","admin","estimator"], group: "comms" },
  { id: "ghl_webhook",  label: "Lead Webhook",           icon: Globe,           ownerOnly: true,  group: "comms" },

  { id: "integrations", label: "Integrations",           icon: Plug,            ownerOnly: true,  group: "integrations" },
  { id: "quickbooks",   label: "QuickBooks Online",      icon: BookOpen,        ownerOnly: true,  group: "integrations" },
  { id: "stripe",       label: "Stripe Payments",        icon: CreditCard,      ownerOnly: true,  group: "integrations" },

  { id: "billing",      label: "Billing",                icon: CreditCard,      ownerOnly: true,  group: "admin" },
  { id: "payroll_settings", label: "Payroll",            icon: Timer,           ownerOnly: true,  group: "admin" },
  { id: "activity",     label: "Activity Log",           icon: Activity,        ownerOnly: true,  group: "admin" },
];

const GROUP_LABELS = {
  company: "Company",
  sales: "Sales & Estimating",
  production: "Production",
  comms: "Communications",
  integrations: "Integrations",
  admin: "Administration",
};

const GROUP_ORDER = ["company", "sales", "production", "comms", "integrations", "admin"];

export default function Settings() {
  const { user } = useAuth();
  const userRoles = getUserRoles(user);
  const isOwner = isOwnerLevel(user);

  const visible = ALL_ITEMS.filter(s => {
    if (s.ownerOnly) return isOwner;
    if (s.roles) return userRoles.some(r => s.roles.includes(r));
    return false;
  });

  const [active, setActive] = useState(visible[0]?.id || "company");
  const [collapsed, setCollapsed] = useState({});
  const [query, setQuery] = useState("");

  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();
  const matched = searching ? visible.filter(i => i.label.toLowerCase().includes(q)) : visible;

  // Group visible items, preserving GROUP_ORDER
  const grouped = GROUP_ORDER
    .map(g => ({ group: g, items: matched.filter(i => i.group === g) }))
    .filter(g => g.items.length > 0);

  const activeItem = visible.find(i => i.id === active);

  function toggleGroup(g) {
    setCollapsed(prev => ({ ...prev, [g]: !prev[g] }));
  }

  function renderSection() {
    switch (active) {
      case "company":      return <CompanySection />;
      case "users":        return <UsersRolesSection />;
      case "job_costing":  return <JobCostingSection />;
      case "employees":    return <EmployeeInviteSection />;
      case "notifications":return <NotificationsSection isOwner={isOwner} userRole={userRoles[0] || "user"} />;
      case "templates":    return <MessageTemplatesSection />;
      case "integrations": return <IntegrationsSection />;
      case "ghl_webhook":  return <GHLLeadWebhookSection />;
      case "jobboard":     return <JobBoardSettingsSection />;
      case "catalog":      return <ServiceCatalogSection />;
      case "contracts":    return <DocumentTemplatesSection />;
      case "stripe":       return <StripeSettingsSection />;
      case "quickbooks":   return <QuickBooksSection />;
      case "billing":      return <BillingSection />;
      case "payroll_settings": return <PayrollSettingsSection />;
      case "security":     return <SecuritySection />;
      case "activity":     return <AdminActivityLogSection />;
      case "attachments":  return <AttachmentCategoriesSection />;
      case "jobdetail":    return <JobDetailOptionsSection />;
      default:             return null;
    }
  }

  return (
    <div className="flex h-full min-h-screen bg-background">
      {/* Left sub-nav */}
      <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col py-4 overflow-y-auto">
        <div className="px-4 mb-4">
          <h1 className="text-base font-bold tracking-tight">Settings</h1>
        </div>
        <div className="px-2 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search settings"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
        <nav className="flex-1 px-2 space-y-3">
          {grouped.length === 0 && (
            <p className="px-3 text-xs text-muted-foreground">No settings match “{query}”.</p>
          )}
          {grouped.map(({ group, items }) => {
            const isCollapsed = !searching && collapsed[group];
            return (
              <div key={group}>
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  {GROUP_LABELS[group]}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5 mt-0.5">
                    {items.map(s => {
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
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-[900px]">
          {activeItem && (
            <h2 className="text-xl font-bold tracking-tight mb-6">{activeItem.label}</h2>
          )}
          {renderSection()}
        </div>
      </main>
    </div>
  );
}