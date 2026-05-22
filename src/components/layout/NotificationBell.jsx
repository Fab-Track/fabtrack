import React, { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";

const TYPE_COLORS = {
  new_lead: "bg-blue-100 text-blue-700",
  overdue_invoice: "bg-red-100 text-red-700",
  info: "bg-gray-100 text-gray-600",
};

export default function NotificationBell({ collapsed }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => base44.entities.Notification.list("-created_date", 50),
    refetchInterval: 30000,
  });

  // Filter to this user's role
  const myNotifications = notifications.filter(n =>
    !n.target_roles || n.target_roles.length === 0 || n.target_roles.includes(user?.role)
  );
  const unread = myNotifications.filter(n => !n.is_read);

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = async () => {
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full relative"
      >
        <div className="relative shrink-0">
          <Bell className={`w-4 h-4 ${collapsed ? "mx-auto" : ""}`} />
          {unread.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </div>
        {!collapsed && <span>Notifications</span>}
        {!collapsed && unread.length > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-full bottom-0 ml-2 w-80 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold">Notifications</p>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y">
            {myNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
            ) : (
              myNotifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-muted/40 cursor-pointer ${!n.is_read ? "bg-blue-50/60" : ""}`}
                  onClick={() => { if (!n.is_read) markReadMutation.mutate(n.id); setOpen(false); }}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                    <div className={!n.is_read ? "" : "pl-4"}>
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[n.type] || TYPE_COLORS.info}`}>
                          {n.type === "new_lead" ? "New Lead" : n.type === "overdue_invoice" ? "Overdue" : "Info"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {n.created_date ? formatDistanceToNow(parseISO(n.created_date), { addSuffix: true }) : ""}
                        </span>
                        {n.link && (
                          <Link to={n.link} className="text-[10px] text-primary hover:underline ml-auto" onClick={e => e.stopPropagation()}>
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}