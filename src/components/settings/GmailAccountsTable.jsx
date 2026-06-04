import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Circle, ExternalLink, RefreshCw, Info, Unlink } from "lucide-react";
import { toast } from "sonner";
import GmailSystemSenderCard from "./GmailSystemSenderCard";

const EMAIL_ROLES = ["owner", "estimator", "shop_manager", "admin", "accountant"];
const ALLOWED_DOMAIN = "highcountrymetalworks.com";

function StatusBadge({ employee }) {
  const status = employee.gmail_token_status;
  if (status === "connected" && employee.gmail_connected)
    return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle2 className="w-3 h-3" />Connected</Badge>;
  if (status === "expired")
    return <Badge className="gap-1 bg-yellow-100 text-yellow-700 border-yellow-200 text-xs"><AlertCircle className="w-3 h-3" />Expired</Badge>;
  return <Badge variant="outline" className="gap-1 text-muted-foreground text-xs"><Circle className="w-3 h-3" />Not Connected</Badge>;
}

function ConnectRow({ employee, onRefresh }) {
  const isConnected = employee.gmail_connected && employee.gmail_token_status === "connected";
  const isExpired = employee.gmail_token_status === "expired";
  const [connecting, setConnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  async function handleConnect() {
    setConnecting(true);
    const res = await base44.functions.invoke("gmailOAuthStart", { type: "user", employee_id: employee.id });
    setConnecting(false);
    if (res.data?.error) { toast.error(res.data.error); return; }
    const popup = window.open(res.data.auth_url, "_blank", "width=500,height=650");
    const timer = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(timer); onRefresh(); }
    }, 800);
    function onMsg(e) {
      if (e.data?.type === "gmail_oauth_success") { toast.success(e.data.message); onRefresh(); window.removeEventListener("message", onMsg); }
      else if (e.data?.type === "gmail_oauth_error") { toast.error(e.data.message); window.removeEventListener("message", onMsg); }
    }
    window.addEventListener("message", onMsg);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const res = await base44.functions.invoke("gmailDisconnect", { type: "user", employee_id: employee.id });
    setDisconnecting(false);
    if (res.data?.ok) { toast.success("Disconnected."); onRefresh(); }
    else toast.error(res.data?.error || "Failed.");
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-2.5 px-3 text-sm font-medium">{employee.name}</td>
      <td className="py-2.5 pr-4 text-xs text-muted-foreground font-mono">
        {employee.gmail_connected_email || employee.assigned_comm_email || <span className="italic text-muted-foreground/60">—</span>}
      </td>
      <td className="py-2.5 pr-4"><StatusBadge employee={employee} /></td>
      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
        {employee.gmail_connected_at ? new Date(employee.gmail_connected_at).toLocaleDateString() : "—"}
      </td>
      <td className="py-2.5 pr-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {employee.assigned_comm_email ? (
            <Button size="sm" variant={isExpired ? "destructive" : "outline"} className="h-7 text-xs gap-1"
              onClick={handleConnect} disabled={connecting}>
              {connecting ? <span className="w-3 h-3 border-2 border-t-transparent border-current rounded-full animate-spin" /> : <ExternalLink className="w-3 h-3" />}
              {isConnected ? "Reconnect" : isExpired ? "Reconnect" : "Connect"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground italic">Assign email first</span>
          )}
          {isConnected && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={handleDisconnect} disabled={disconnecting}>
              <Unlink className="w-3 h-3" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function GmailAccountsTable() {
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
    staleTime: 30000,
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["employees"] }); }

  const emailEmployees = employees.filter(e =>
    EMAIL_ROLES.includes(e.role?.toLowerCase() || "") && e.is_active !== false
  );
  const connectedCount = emailEmployees.filter(e => e.gmail_connected && e.gmail_token_status === "connected").length;

  return (
    <div className="space-y-5">
      {/* System Sender */}
      <GmailSystemSenderCard />

      {/* Privacy note */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>FabTrack only uses Gmail to send messages — no inbox is read or stored. Each user authorizes their own account. Only <strong>@{ALLOWED_DOMAIN}</strong> addresses are accepted.</span>
      </div>

      {/* Per-user table */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Per-User Connections</p>
        <p className="text-xs text-muted-foreground mb-3">Used for direct customer messages. When not connected, messages fall back to the system sender.</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : emailEmployees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees with email roles found.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b flex items-center justify-between">
              <span className="text-xs font-semibold">Team Gmail Accounts</span>
              <Badge variant="outline" className="text-xs">{connectedCount} / {emailEmployees.length} connected</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10">
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Employee</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Gmail Address</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Last Auth</th>
                    <th className="py-2 pr-3 text-xs font-medium text-muted-foreground text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {emailEmployees.map(emp => (
                    <ConnectRow key={emp.id} employee={emp} onRefresh={refresh} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}