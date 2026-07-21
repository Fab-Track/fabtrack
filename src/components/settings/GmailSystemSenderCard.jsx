import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Circle, RefreshCw, Unlink, ExternalLink, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";



function StatusBadge({ status }) {
  if (status === "connected") return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3" />Connected</Badge>;
  if (status === "expired") return <Badge className="gap-1 bg-yellow-100 text-yellow-700 border-yellow-200"><AlertCircle className="w-3 h-3" />Expired</Badge>;
  return <Badge variant="outline" className="gap-1 text-muted-foreground"><Circle className="w-3 h-3" />Not Connected</Badge>;
}

export default function GmailSystemSenderCard() {
  const { user } = useAuth();
  const userRoles = [user?.role, ...(user?.roles || [])].filter(Boolean).map(r => String(r).toLowerCase());
  const isOwner = userRoles.some(r => ["admin", "owner"].includes(r));
  const [status, setStatus] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function fetchStatus() {
    const res = await base44.functions.invoke("gmailGetStatus", {});
    if (res.data?.system_sender) setStatus(res.data.system_sender);
  }

  // On mount: check URL params for OAuth return result, then fetch status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("gmail_result");
    const message = params.get("gmail_message");
    const section = params.get("section");

    if (result && section === "integrations") {
      if (result === "success") toast.success(message || "Gmail connected successfully.");
      else toast.error(message || "Gmail connection failed.");
      // Clean up URL params without reloading
      const clean = new URL(window.location.href);
      clean.searchParams.delete("gmail_result");
      clean.searchParams.delete("gmail_message");
      clean.searchParams.delete("section");
      window.history.replaceState({}, "", clean.toString());
    }

    fetchStatus();
  }, []);

  async function handleConnect() {
    setConnecting(true);
    const res = await base44.functions.invoke("gmailOAuthStart", { type: "system" });
    setConnecting(false);
    if (res.data?.error) { toast.error(res.data.error); return; }
    // Full redirect — Google will return us to the app via the callback
    window.location.href = res.data.auth_url;
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const res = await base44.functions.invoke("gmailDisconnect", { type: "system" });
    setDisconnecting(false);
    if (res.data?.ok) { toast.success("System sender disconnected."); fetchStatus(); }
    else toast.error(res.data?.error || "Disconnect failed.");
  }

  const s = status;
  const isConnected = s?.status === "connected";
  const isExpired = s?.status === "expired";

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Company Email Sender</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Org-wide</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            All estimates and invoices are sent from the connected system sender
          </p>
        </div>
        {s === null ? (
          <div className="w-4 h-4 border-2 border-t-transparent border-primary rounded-full animate-spin mt-0.5" />
        ) : (
          <StatusBadge status={s.status} />
        )}
      </div>

      {isExpired && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-xs text-yellow-800">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span><strong>Action required:</strong> The billing email connection has expired. Estimate and invoice sending is blocked until reconnected.</span>
        </div>
      )}

      {!isConnected && !isExpired && s !== null && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Not connected. Estimates and invoices cannot be emailed until the system sender is connected.</span>
        </div>
      )}

      {isConnected && s?.email && (
        <p className="text-xs text-muted-foreground">
          Connected as <strong>{s.email}</strong>
          {s.connected_at && <> · {new Date(s.connected_at).toLocaleDateString()}</>}
        </p>
      )}

      {isOwner ? (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={isExpired ? "destructive" : isConnected ? "outline" : "default"}
            className="gap-1.5 h-8 text-xs"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <><span className="w-3 h-3 border-2 border-t-transparent border-current rounded-full animate-spin" />Redirecting…</>
            ) : isConnected ? (
              <><RefreshCw className="w-3 h-3" />Reconnect</>
            ) : (
              <><ExternalLink className="w-3 h-3" />{isExpired ? "Reconnect System Email" : "Connect System Email"}</>
            )}
          </Button>
          {isConnected && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 h-8 text-xs text-muted-foreground"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              <Unlink className="w-3 h-3" />Disconnect
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Only the owner can connect or disconnect the system sender.</p>
      )}
    </div>
  );
}