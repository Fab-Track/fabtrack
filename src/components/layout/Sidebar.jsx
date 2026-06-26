import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Kanban, Wrench, Clock,
  FileText, CalendarDays, Calendar, Users, Package,
  Trophy, ChevronLeft, ChevronRight,
  Building2, Settings, Menu, X, BarChart2, MessageCircle, MessagesSquare, LogOut, Bug, Shield, CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole, usePreviewRole } from "@/lib/PreviewRoleContext";
import { useImpersonation, canImpersonate } from "@/lib/ImpersonationContext";
import { getUserRoles } from "@/lib/roleHelpers";
import { canAccessChannel } from "@/lib/messagingHelpers";
import PreviewRoleSelector from "./PreviewRoleSelector";
import NotificationBell from "./NotificationBell";
import ReportProblemModal from "@/components/super-admin/ReportProblemModal";

// ── All possible nav items ──────────────────────────────────────────────────
const ALL_ITEMS = {
  dashboard:      { label: "Dashboard",       icon: LayoutDashboard, path: "/dashboard" },
  messages:       { label: "Messages",         icon: MessageCircle,   path: "/messages" },
  jobBoard:       { label: "Job Board",        icon: Kanban,          path: "/jobs" },
  customers:      { label: "Customers",        icon: Users,           path: "/customers" },
  conversations:  { label: "Conversations",    icon: MessagesSquare,  path: "/conversations" },
  documents:      { label: "Documents",        icon: FileText,        path: "/documents" },
  reports:        { label: "Reports",          icon: BarChart2,       path: "/reports" },
  calendar:       { label: "Calendar",         icon: Calendar,        path: "/calendar" },
  schedule:       { label: "Schedule",         icon: CalendarDays,    path: "/schedule" },
  workCenters:    { label: "Work Centers",     icon: Wrench,          path: "/work-centers" },
  inventory:      { label: "Inventory",        icon: Package,         path: "/inventory" },
  shopFloor:      { label: "Time Card",        icon: Clock,           path: "/kiosk" },
  craftsmanScore: { label: "Craftsman Score",  icon: Trophy,          path: "/craftsman" },
  employees:      { label: "Employees",        icon: Building2,       path: "/employees" },
  myTimesheet:    { label: "My Timesheet",     icon: Clock,           path: "/my-timesheet" },
  payroll:        { label: "Time & Payroll",   icon: Clock,           path: "/admin-payroll" },
  billing:        { label: "Billing",          icon: CreditCard,      path: "/billing" },
  settings:       { label: "Settings",         icon: Settings,        path: "/settings" },
  superAdmin:     { label: "Super Admin",      icon: Shield,          path: "/super-admin" },
};

// ── Role → grouped nav config ───────────────────────────────────────────────
const ROLE_NAV = {
  admin: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard", "customers", "conversations", "documents"] },
    { group: "OPERATIONS",  items: ["calendar", "reports", "schedule", "workCenters", "inventory"] },
    { group: "SHOP",        items: ["shopFloor", "craftsmanScore", "employees"] },
    { group: "PAYROLL",     items: ["payroll"] },
    { group: "ACCOUNT",     items: ["billing", "settings"] },
  ],
  owner: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard", "customers", "conversations", "documents"] },
    { group: "OPERATIONS",  items: ["calendar", "reports", "schedule", "workCenters", "inventory"] },
    { group: "SHOP",        items: ["shopFloor", "craftsmanScore", "employees"] },
    { group: "PAYROLL",     items: ["payroll"] },
    { group: "ACCOUNT",     items: ["billing", "settings"] },
  ],
  shop_manager: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "OPERATIONS",  items: ["calendar", "jobBoard", "reports", "schedule", "workCenters", "inventory"] },
    { group: "SALES",       items: ["conversations"] },
    { group: "SHOP",        items: ["shopFloor", "craftsmanScore", "employees"] },
    { group: "PAYROLL",     items: ["payroll"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  estimator: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard", "customers", "conversations", "documents"] },
    { group: "OPERATIONS",  items: ["calendar", "reports"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  design_specialist: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "WORK",        items: ["calendar", "jobBoard", "schedule"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  fabricator: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "JOBS",        items: ["jobBoard"] },
    { group: "SHOP",        items: ["calendar", "schedule", "shopFloor"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  installer: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "JOBS",        items: ["jobBoard"] },
    { group: "SHOP",        items: ["calendar", "schedule", "shopFloor"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  accountant: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard"] },
    { group: "FINANCE",     items: ["calendar", "documents", "customers", "conversations", "reports"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  payroll: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "CALENDAR",    items: ["calendar"] },
    { group: "PAYROLL",     items: ["payroll"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  welder: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SHOP",        items: ["calendar", "shopFloor"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  foreman: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "OPERATIONS",  items: ["calendar", "schedule", "workCenters"] },
    { group: "SHOP",        items: ["shopFloor", "employees"] },
    { group: "PAYROLL",     items: ["payroll"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
  // fallback for any unrecognized role — same as admin
  user: [
    { group: "OVERVIEW",    items: ["dashboard", "messages"] },
    { group: "SALES",       items: ["jobBoard", "customers", "conversations", "documents"] },
    { group: "OPERATIONS",  items: ["calendar", "reports", "schedule", "workCenters", "inventory"] },
    { group: "SHOP",        items: ["shopFloor", "craftsmanScore", "employees"] },
    { group: "PAYROLL",     items: ["payroll"] },
    { group: "TIME",        items: ["myTimesheet"] },
    { group: "ACCOUNT",     items: ["settings"] },
  ],
};

function getNavGroups(role) {
  return ROLE_NAV[role] || ROLE_NAV["user"];
}

/** Union of nav groups across multiple roles */
function getUnionNavGroups(roles) {
  if (!roles || roles.length === 0) return ROLE_NAV["user"];
  // Collect all items each role grants, preserving group name for ordering
  const groupOrder = [];
  const seenGroups = new Set();
  const itemsPerGroup = new Map(); // groupName -> Set of item keys

  roles.forEach(role => {
    const groups = ROLE_NAV[role] || ROLE_NAV["user"];
    groups.forEach(g => {
      if (!itemsPerGroup.has(g.group)) {
        groupOrder.push(g.group);
        itemsPerGroup.set(g.group, new Set());
      }
      g.items.forEach(item => itemsPerGroup.get(g.group).add(item));
    });
  });

  return groupOrder.map(group => ({
    group,
    items: [...itemsPerGroup.get(group)],
  }));
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
        "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all duration-150",
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
  const [showReportModal, setShowReportModal] = useState(false);

  const userRoles = getUserRoles(user);
  const effectiveRole = useEffectiveRole(userRoles[0] || "user");
  const isOwner = userRoles.some(r => OWNER_ROLES.includes(r));
  const isSuperAdmin = userRoles.includes("super_admin");
  const userCanImpersonate = canImpersonate(userRoles[0] || "user");

  const navGroups = getUnionNavGroups(userRoles);
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
    queryFn: () => base44.entities.ChannelMembership.filter({ user_id: user?.id || user?.email, organization_id: user?.organization_id }),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const { data: recentMessages = [] } = useQuery({
    queryKey: ["messages-sidebar-unread"],
    queryFn: () => base44.entities.Message.list("-created_date", 300),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const { data: customerMessages = [] } = useQuery({
    queryKey: ["commMessages-sidebar-unread"],
    queryFn: () => base44.entities.CommMessage.list("-created_date", 200),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const userId = user?.id || user?.email || "";
  const userRole = user?.role || "user";
  const userEmail = user?.email || "";
  const internalUnread = channels.reduce((acc, ch) => {
    // Only count channels the user can actually see in the list — matches Messages page
    if (ch.is_archived) return acc;
    if (!canAccessChannel(ch, userRole, userId, userEmail)) return acc;
    const membership = memberships.find(m => m.channel_id === ch.id);
    const lastRead = membership?.last_read_at ? new Date(membership.last_read_at) : new Date(0);
    const unread = recentMessages.filter(m =>
      m.channel_id === ch.id &&
      new Date(m.created_date) > lastRead &&
      m.sender_id !== userId
    ).length;
    return acc + unread;
  }, 0);
  // Count inbound customer messages that have no subsequent outbound reply
  const sortedCustomerMsgs = [...customerMessages].sort((a, b) =>
    ((a.sent_at || a.created_date) || "").localeCompare((b.sent_at || b.created_date) || "")
  );
  const customerUnread = sortedCustomerMsgs.filter(m => {
    if (m.direction !== "inbound") return false;
    const inTime = new Date(m.sent_at || m.created_date);
    return !sortedCustomerMsgs.find(out =>
      out.direction !== "inbound" &&
      out.customer_id === m.customer_id &&
      new Date(out.sent_at || out.created_date) > inTime
    );
  }).length;

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
            {(isSuperAdmin ? "Platform Owner" : user?.organization_name) && (
              <span className="text-[11px] text-sidebar-foreground/60 font-medium leading-tight truncate">
                {isSuperAdmin ? "Platform Owner" : user?.organization_name}
              </span>
            )}
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
                    badge={
                      item.path === "/messages" ? internalUnread :
                      item.path === "/conversations" ? customerUnread :
                      0
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Super Admin — pinned link for platform owners only */}
      {isSuperAdmin && (
        <div className="px-2 pb-2 border-t border-sidebar-border/50 pt-2">
          <NavLink
            item={ALL_ITEMS["superAdmin"]}
            collapsed={collapsed}
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Preview Role + Collapse + Logout — desktop only */}
      <div className="hidden md:block px-2 py-3 border-t border-sidebar-border space-y-1">
        <NotificationBell collapsed={collapsed} />
        <button
          onClick={() => setShowReportModal(true)}
          title={collapsed ? "Report a Problem" : undefined}
          className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <Bug className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span>Report a Problem</span>}
        </button>
        {userCanImpersonate && <PreviewRoleSelector collapsed={collapsed} />}
        <button
          onClick={() => base44.auth.logout("/login")}
          title={collapsed ? "Log Out" : undefined}
          className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-md text-sm text-sidebar-foreground/50 hover:text-red-400 hover:bg-sidebar-accent w-full transition-colors"
        >
          <LogOut className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span>Log Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
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
        <button onClick={() => setMobileOpen(true)} className="text-white min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
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
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-md text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
            <div className="px-2 py-3 border-t border-sidebar-border shrink-0">
              <button
                onClick={() => base44.auth.logout("/login")}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-md text-sm text-sidebar-foreground/50 hover:text-red-400 hover:bg-sidebar-accent w-full transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportProblemModal open={showReportModal} onClose={() => setShowReportModal(false)} />

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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border flex safe-area-bottom" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map((item) => {
        const isActive = item.path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 text-xs font-medium transition-colors",
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