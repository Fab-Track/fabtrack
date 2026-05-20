import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { UserCheck, LogOut, Clock, Edit } from "lucide-react";

const ACTION_CONFIG = {
  impersonation_started: { label: "Started Viewing", icon: UserCheck, color: "bg-blue-100 text-blue-700" },
  impersonation_ended:   { label: "Ended Viewing",   icon: LogOut,     color: "bg-gray-100 text-gray-600" },
  clock_out_override:    { label: "Clock-Out Override", icon: Clock,  color: "bg-orange-100 text-orange-700" },
  time_entry_edit:       { label: "Time Edit",        icon: Edit,       color: "bg-purple-100 text-purple-700" },
};

export default function AdminActivityLogSection() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["adminActivityLog"],
    queryFn: () => base44.entities.AdminActivityLog.list("-created_date", 100),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-base">Admin Activity Log</h2>
        <p className="text-sm text-muted-foreground">All employee impersonation and admin override actions. Last 100 entries.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6">Loading logs…</p>
      ) : logs.length === 0 ? (
        <div className="border rounded-xl p-8 text-center text-muted-foreground">
          <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No admin actions logged yet.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_2fr_100px] gap-3 px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground">
            <span>Admin</span>
            <span>Viewed As</span>
            <span>Action</span>
            <span>Detail</span>
            <span>When</span>
          </div>
          <div className="divide-y">
            {logs.map(log => {
              const cfg = ACTION_CONFIG[log.action_type] || { label: log.action_type, icon: UserCheck, color: "bg-gray-100 text-gray-600" };
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="grid grid-cols-[1fr_1fr_1fr_2fr_100px] gap-3 px-4 py-3 items-center text-sm hover:bg-muted/20">
                  <span className="font-medium truncate">{log.admin_user_name || log.admin_user_email}</span>
                  <span className="text-muted-foreground truncate">{log.impersonated_employee_name}</span>
                  <Badge className={`${cfg.color} border-0 gap-1 w-fit`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{log.action_detail}</span>
                  <span className="text-xs text-muted-foreground">
                    {log.created_date ? format(parseISO(log.created_date), "MMM d, h:mm a") : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}