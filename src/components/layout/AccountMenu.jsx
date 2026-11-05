import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

export default function AccountMenu({ collapsed }) {
  const { user } = useAuth();
  const fullName = user?.full_name || user?.email || "My Account";
  const initials = (user?.full_name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={fullName}
          className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] w-full rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Avatar className="w-6 h-6 shrink-0">
            {user?.profile_photo_url && <AvatarImage src={user.profile_photo_url} alt={fullName} />}
            <AvatarFallback className="text-[10px] font-bold bg-sidebar-primary text-sidebar-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="flex-1 text-left truncate">{user?.full_name || "My Account"}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{fullName}</p>
          {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account" className="cursor-pointer gap-2">
            <User className="w-4 h-4" />
            My Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
          onClick={() => base44.auth.logout("/login")}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}