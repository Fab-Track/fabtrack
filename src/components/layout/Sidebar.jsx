import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Kanban, Wrench, Clock,
  FileText, CalendarDays, Users, Package,
  Trophy, ChevronLeft, ChevronRight,
  Building2, Settings, Menu, X, BarChart2, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole, usePreviewRole } from "@/lib/PreviewRoleContext";
import { useImpersonation, canImpersonate } from "@/lib/ImpersonationContext";
import PreviewRoleSelector from "./PreviewRoleSelector";
import NotificationBell from "./NotificationBell";

// ── All possible nav items ──────────────────────────────────────────────────
const ALL_ITEMS = {
  dashboard:      { label: "Dashboard",       icon: LayoutDashboard, path: "/" },
  messages:       { label: "Messages",         icon: MessageCircle,   path: "/messages" },
  jobBoard:       { label: "Job Board",        icon: Kanban,          path: "/jobs" },
  customers:      { label: "Customers",        icon: Users,           path: "/customers" },
  documents:      { label: "Documents",        icon: FileText,        path: "/documents" },
  reports:        { label: "Reports",          icon: BarChart2,       path: "/reports" },
  schedule:       { label: "Schedule",         icon: CalendarDays,    path: "/schedule" },
  workCenters:    { label: "Work Centers",     icon: Wrench,          path: "/work-centers" },
  inventory:      { label: "Inventory",        icon: Package,         path: "/inventory" },
  shopFloor:      { label: "Shop Floor",       icon: Clock,           path: "/kiosk" },
  craftsmanScore: { label: "Craftsman Score",  icon: Trophy,          path: "/craftsman" },
  employees:      { label: "Employees",        icon: Building2,       path: "/employees" },
  settings:       { label: "Settings",         icon: Settings,        path: "/settings" },
};

// ── Role → grouped nav config ───────────────────────────────────────────────
const ROLE_NAV = {
  admin: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard", "customers", "documents"] },
    { group: "OPERATIONS",  items: ["reports", "schedule", "workCenters", "inventory"] },
    { group: "SHOP",        items: ["shopFloor", "craftsmanScore", "employees"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  shop_manager: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "OPERATIONS",  items: ["jobBoard", "reports", "schedule", "workCenters", "inventory"] },
    { group: "SHOP",        items: ["shopFloor", "craftsmanScore", "employees"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  estimator: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard", "customers", "documents"] },
    { group: "OPERATIONS",  items: ["reports"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  design_specialist: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "WORK",        items: ["jobBoard", "schedule"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  fabricator: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SHOP",        items: ["schedule", "shopFloor"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  installer: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "WORK",        items: ["schedule"] },
    { group: "SHOP",        items: ["shopFloor"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  accountant: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard"] },
    { group: "FINANCE",     items: ["documents", "customers", "reports"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  // fallback for any unrecognized role — same as admin
  user: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard", "customers", "documents"] },
    { group: "OPERATIONS",  items: ["reports", "schedule", "workCenters", "inventory"] },
    { group: "SHOP",        items: ["shopFloor", "craftsmanScore", "employees"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
};

function getNavGroups(role) {
  return ROLE_NAV[role] || ROLE_NAV["user"];
}

// Top 4 items for mobile bottom bar (flattened, skipping settings)
function getMobileItems(groups) {
  const flat = groups.flatMap(g => g.items).filter(k => k !== "settings");
  return flat.slice(0, 4).map(k => ALL_ITEMS[k]);
}

// ── NavLink ─────────────────────────────────────────────────────────────────
function NavLink({ item, collapsed, onClick, badge }) {
  const location = useLocation();
  const isActive = item.path === "/" 
    ? location.pathname === "/" 
    : location.pathname.startsWith(item.path);

  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <div className="relative shrink-0">
        <item.icon className={cn("w-4 h-4", collapsed && "mx-auto")} />
        {badge > 0 && collapsed && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
const OWNER_ROLES = ["owner", "admin"];

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const realRole = user?.role || "user";
  const effectiveRole = useEffectiveRole(realRole);
  const isOwner = OWNER_ROLES.includes(realRole.toLowerCase());
  const userCanImpersonate = canImpersonate(realRole);

  const navGroups = getNavGroups(effectiveRole);
  const mobileItems = getMobileItems(navGroups);

  // Unread message count for badge
  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: () => base44.entities.MessageChannel.list("sort_order", 200),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships", user?.id],
    queryFn: () => base44.entities.ChannelMembership.filter({ user_id: user?.id || user?.email }),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const { data: recentMessages = [] } = useQuery({
    queryKey: ["messages-sidebar-unread"],
    queryFn: () => base44.entities.Message.list("-created_date", 300),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const userId = user?.id || user?.email || "";
  const totalUnread = channels.reduce((acc, ch) => {
    const membership = memberships.find(m => m.channel_id === ch.id);
    const lastRead = membership?.last_read_at ? new Date(membership.last_read_at) : new Date(0);
    const unread = recentMessages.filter(m =>
      m.channel_id === ch.id && new Date(m.created_date) > lastRead && m.sender_id !== userId
    ).length;
    return acc + unread;
  }, 0);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Wrench className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-sm text-white tracking-wide">FABTRACK</span>
            <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Operations</span>
          </div>
        )}
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-sidebar-foreground/40 uppercase">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((key) => {
                const item = ALL_ITEMS[key];
                if (!item) return null;
                return (
                  <NavLink
                    key={key}
                    item={item}
                    collapsed={collapsed}
                    onClick={() => setMobileOpen(false)}
                    badge={item.path === "/messages" ? totalUnread : 0}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Preview Role + Collapse — desktop only */}
      <div className="hidden md:block px-2 py-3 border-t border-sidebar-border space-y-1">
        <NotificationBell collapsed={collapsed} />
        {userCanImpersonate && <PreviewRoleSelector collapsed={collapsed} />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 mx-auto" />
            : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>
          }
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar z-50 flex items-center px-4 border-b border-sidebar-border">
        <button onClick={() => setMobileOpen(true)} className="text-white">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-6 h-6 rounded bg-sidebar-primary flex items-center justify-center">
            <Wrench className="w-3 h-3 text-sidebar-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-white">FABTRACK</span>
        </div>
      </div>

      {/* ── Mobile slide-out drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-sidebar-foreground/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-sidebar z-40 transition-all duration-200 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-56"
      )}>
        {sidebarContent}
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <MobileBottomBar items={mobileItems} />
    </>
  );
}

// ── Mobile Bottom Tab Bar ────────────────────────────────────────────────────
function MobileBottomBar({ items }) {
  const location = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border flex">
      {items.map((item) => {
        const isActive = item.path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors",
              isActive
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}