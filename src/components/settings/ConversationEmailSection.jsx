import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mail, Plus, Trash2, RefreshCw, Loader2, Users, User, CheckCircle2, AlertCircle, Circle, Shield } from "lucide-react";
import { toast } from "sonner";

function StatusBadge({ status }) {
  if (status === "connected")
    return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3" />Connected</Badge>;
  if (status === "error")
    return <Badge className="gap-1 bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3" />Error</Badge>;
  return <Badge variant="outline" className="gap-1 text-muted-foreground"><Circle className="w-3 h-3" />Disconnected</Badge>;
}

function AccountRow({ account, onDisconnect, onSync, syncing }) {
  const isShared = account.account_type === "shared";
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isShared ? "bg-orange-50" : "bg-blue-50"}`}>
        {isShared ? <Users className="w-4 h-4 text-orange-600" /> : <User className="w-4 h-4 text-blue-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{account.email}</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isShared ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
            {isShared ? "Shared" : "Employee"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isShared ? (account.display_name || "Company inbox") : (account.employee_name || account.display_name)}
          {account.last_sync_at && ` · Last sync ${new Date(account.last_sync_at).toLocaleString()}`}
          {account.sync_error && <span className="text-red-500"> · {account.sync_error}</span>}
        </p>
      </div>
      <StatusBadge status={account.status} />
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onSync} disabled={syncing} title="Sync now">
        {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
      </Button>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDisconnect} title="Disconnect">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function ConversationEmailSection({ onStatusChange }) {
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setOrgId(u?.organization_id || null);
      setUserEmail(u?.email || null);
      const roles = [u?.role, ...(u?.roles || [])].filter(Boolean).map(r => String(r).toLowerCase());
      setIsOwner(roles.some(r => ['admin', 'owner', 'super_admin'].includes(r)));
    }).catch(() => {});
  }, []);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["emailAccounts", orgId],
    queryFn: () => orgId ? base44.entities.EmailAccount.filter({ organization_id: orgId }, "-connected_at", 50) : [],
    enabled: !!orgId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
    enabled: !!orgId,
    staleTime: 30000,
  });

  const myEmployee = employees.find(e => e.email === userEmail);
  const canConnectIndividual = isOwner || myEmployee?.individual_email_enabled;

  // Report status to parent (use ref to avoid re-render loops)
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;
  useEffect(() => {
    const hasConnected = accounts.some(a => a.status === "connected");
    statusRef.current?.(hasConnected ? "connected" : "disconnected");
  }, [accounts]);

  // Poll for connection result when OAuth tab is open
  useEffect(() => {
    if (!connecting) return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["emailAccounts"] });
    }, 2500);
    const timeout = setTimeout(() => {
      setConnecting(false);
      clearInterval(interval);
    }, 120000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [connecting, qc]);

  const handleConnect = useCallback(async (accountType) => {
    setConnecting(true);
    try {
      const resp = await base44.functions.invoke("gmailOAuthStart", {
        type: "conversation",
        account_type: accountType,
      });
      if (resp.data?.auth_url) {
        window.open(resp.data.auth_url, "_blank");
      } else {
        setConnecting(false);
        toast.error(resp.data?.error || "Could not start Gmail connection");
      }
    } catch (err) {
      setConnecting(false);
      toast.error(err.message || "Failed to start connection");
    }
  }, []);

  const handleDisconnect = async (id) => {
    if (!confirm("Disconnect this email account? Incoming messages will no longer sync.")) return;
    try {
      await base44.functions.invoke("disconnectConversationEmail", { account_id: id });
      qc.invalidateQueries({ queryKey: ["emailAccounts"] });
      toast.success("Email account disconnected");
    } catch (err) {
      toast.error(err.message || "Failed to disconnect");
    }
  };

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      const resp = await base44.functions.invoke("syncConversationEmails", { account_id: id });
      if (resp.data?.ok) {
        toast.success(`Synced ${resp.data.synced || 0} new message(s)`);
        qc.invalidateQueries({ queryKey: ["emailAccounts"] });
        qc.invalidateQueries({ queryKey: ["commMessages"] });
      } else {
        toast.error(resp.data?.error || "Sync failed");
      }
    } catch (err) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleIndividual = async (emp) => {
    setTogglingId(emp.id);
    try {
      await base44.entities.Employee.update(emp.id, {
        individual_email_enabled: !emp.individual_email_enabled,
      });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success(
        emp.individual_email_enabled
          ? `Individual email access disabled for ${emp.preferred_name || emp.name}`
          : `Individual email access enabled for ${emp.preferred_name || emp.name}`
      );
    } catch (err) {
      toast.error(err.message || "Failed to update employee");
    } finally {
      setTogglingId(null);
    }
  };

  const sharedAccounts = accounts.filter(a => a.account_type === "shared");
  const employeeAccounts = accounts.filter(a => a.account_type === "employee");
  const activeEmployees = employees.filter(e => e.is_active !== false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading email accounts…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Email Accounts (Gmail)</h3>
            <p className="text-xs text-muted-foreground">Admin-managed company inboxes are the primary sender for all outgoing shop communications</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
        <strong>How it works:</strong> Admins connect shared company inboxes — all employees can send from these
        without connecting their own email. To let an employee send from a personal Gmail, enable individual
        email access for them below; they can then connect their own account.
      </div>

      {/* Shared accounts — primary path */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-orange-600" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shared Company Accounts</h4>
          <span className="text-[10px] text-muted-foreground">— available to all employees</span>
        </div>
        {sharedAccounts.length > 0 ? (
          <div className="border rounded-lg px-4">
            {sharedAccounts.map(account => (
              <AccountRow
                key={account.id}
                account={account}
                onDisconnect={() => handleDisconnect(account.id)}
                onSync={() => handleSync(account.id)}
                syncing={syncingId === account.id}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">No shared company accounts connected yet.</p>
            <p className="text-[10px] text-muted-foreground mt-1">Connect one so all employees can send email.</p>
          </div>
        )}
      </div>

      {/* Employee accounts — optional, gated by individual_email_enabled */}
      {employeeAccounts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee Accounts</h4>
            <span className="text-[10px] text-muted-foreground">— individual Gmail, optional</span>
          </div>
          <div className="border rounded-lg px-4">
            {employeeAccounts.map(account => (
              <AccountRow
                key={account.id}
                account={account}
                onDisconnect={() => handleDisconnect(account.id)}
                onSync={() => handleSync(account.id)}
                syncing={syncingId === account.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connect buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => handleConnect("shared")} disabled={connecting} className="gap-1.5">
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Connect Shared Inbox
        </Button>
        {canConnectIndividual && (
          <Button size="sm" variant="outline" onClick={() => handleConnect("employee")} disabled={connecting} className="gap-1.5">
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Connect Personal Gmail
          </Button>
        )}
      </div>

      {!canConnectIndividual && (
        <p className="text-[10px] text-muted-foreground">
          Personal Gmail connection requires individual email access, which an admin can enable below.
        </p>
      )}

      {connecting && (
        <p className="text-[10px] text-muted-foreground">
          A new tab opened for Google authorization. This page will update automatically once connected.
        </p>
      )}

      {/* Admin: manage individual email access per employee */}
      {isOwner && activeEmployees.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 pt-2">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Individual Email Access</h4>
            <span className="text-[10px] text-muted-foreground">— admin controlled</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Enable to let an employee connect a personal Gmail for outgoing email. Shared company accounts remain available to everyone regardless of this setting.
          </p>
          <div className="border rounded-lg divide-y">
            {activeEmployees.map(emp => (
              <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{emp.preferred_name || emp.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.email || "No email on file"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {emp.gmail_connected && emp.gmail_token_status === "connected" && (
                    <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 text-[10px]">Gmail connected</Badge>
                  )}
                  <Switch
                    checked={!!emp.individual_email_enabled}
                    onCheckedChange={() => handleToggleIndividual(emp)}
                    disabled={togglingId === emp.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{sharedAccounts.length} shared account{sharedAccounts.length !== 1 ? "s" : ""}</span>
        <span>{employeeAccounts.length} employee account{employeeAccounts.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}