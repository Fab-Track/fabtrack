import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Kanban, Wrench, Clock, FileText, 
  CalendarDays, ShoppingCart, Users, Package, 
  Trophy, ChevronLeft, ChevronRight, Search,
  Building2, Menu, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Job Board", icon: Kanban, path: "/jobs" },
  { label: "Work Centers", icon: Wrench, path: "/work-centers" },
  { label: "Shop Floor", icon: Clock, path: "/kiosk" },
  { label: "Estimates", icon: FileText, path: "/estimates" },
  { label: "Schedule", icon: CalendarDays, path: "/schedule" },
  { label: "Purchasing", icon: ShoppingCart, path: "/purchasing" },
  { label: "Customers", icon: Users, path: "/customers" },
  { label: "Inventory", icon: Package, path: "/inventory" },
  { label: "Craftsman Score", icon: Trophy, path: "/craftsman" },
  { label: "Employees", icon: Building2, path: "/employees" },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

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

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground/40" />
            <Input 
              placeholder="Search jobs..." 
              className="h-8 pl-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
              isActive(item.path)
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Collapse button - desktop only */}
      <div className="hidden md:block px-2 py-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4 mx-auto" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header */}
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

      {/* Mobile overlay */}
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

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-sidebar z-40 transition-all duration-200 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-56"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}