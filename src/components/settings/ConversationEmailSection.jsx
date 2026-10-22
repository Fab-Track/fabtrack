import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Trash2, RefreshCw, Loader2, Users, User, CheckCircle2, AlertCircle, Circle } from "lucide-react";
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
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["emailAccounts", orgId],
    queryFn: () => orgId ? base44.entities.EmailAccount.filter({ organization_id: orgId }, "-connected_at", 50) : [],
    enabled: !!orgId,
  });

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

  const sharedCount = accounts.filter(a => a.account_type === "shared").length;
  const employeeCount = accounts.filter(a => a.account_type === "employee").length;

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading email accounts…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Conversation Email (Gmail)</h3>
            <p className="text-xs text-muted-foreground">Sync incoming and outgoing customer emails into conversation threads</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
        This is separate from estimate email sending. Connect a shared company inbox and/or individual employee Gmail
        accounts to sync customer email conversations. Incoming messages appear in customer threads automatically.
      </div>

      {accounts.length > 0 && (
        <div className="border rounded-lg px-4">
          {accounts.map(account => (
            <AccountRow
              key={account.id}
              account={account}
              onDisconnect={() => handleDisconnect(account.id)}
              onSync={() => handleSync(account.id)}
              syncing={syncingId === account.id}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => handleConnect("shared")} disabled={connecting} className="gap-1.5">
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Connect Shared Inbox
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleConnect("employee")} disabled={connecting} className="gap-1.5">
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Connect Employee Gmail
        </Button>
      </div>

      {connecting && (
        <p className="text-[10px] text-muted-foreground">
          A new tab opened for Google authorization. This page will update automatically once connected.
        </p>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{sharedCount} shared inbox{sharedCount !== 1 ? "es" : ""}</span>
        <span>{employeeCount} employee account{employeeCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}