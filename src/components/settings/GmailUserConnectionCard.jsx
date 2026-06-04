import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Circle, RefreshCw, Unlink, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Shows the personal Gmail connection for a given employee.
// Props: employee (Employee record), onRefresh (callback after status change)
export default function GmailUserConnectionCard({ employee, onRefresh }) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // On mount: check URL params for OAuth return result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("gmail_result");
    const message = params.get("gmail_message");
    const section = params.get("section");

    if (result && section === "account") {
      if (result === "success") toast.success(message || "Gmail connected successfully.");
      else toast.error(message || "Gmail connection failed.");
      // Clean up URL
      const clean = new URL(window.location.href);
      clean.searchParams.delete("gmail_result");
      clean.searchParams.delete("gmail_message");
      clean.searchParams.delete("section");
      window.history.replaceState({}, "", clean.toString());
      onRefresh?.();
    }
  }, []);

  if (!employee) return null;

  const status = employee.gmail_token_status || "disconnected";
  const isConnected = status === "connected" && employee.gmail_connected;
  const isExpired = status === "expired";
  const hasEmail = !!employee.assigned_comm_email;

  async function handleConnect() {
    if (!hasEmail) {
      toast.error("Assign an @highcountrymetalworks.com email to this employee first.");
      return;
    }
    setConnecting(true);
    const res = await base44.functions.invoke("gmailOAuthStart", { type: "user", employee_id: employee.id });
    setConnecting(false);
    if (res.data?.error) { toast.error(res.data.error); return; }
    // Full redirect — Google returns us to the app via the callback
    window.location.href = res.data.auth_url;
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const res = await base44.functions.invoke("gmailDisconnect", { type: "user", employee_id: employee.id });
    setDisconnecting(false);
    if (res.data?.ok) { toast.success("Gmail disconnected."); onRefresh?.(); }
    else toast.error(res.data?.error || "Disconnect failed.");
  }

  return (
    <div className="border rounded-xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Gmail Connection</p>
        {isConnected
          ? <Badge className="bg-green-100 text-green-700 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Connected</Badge>
          : isExpired
            ? <Badge className="bg-yellow-100 text-yellow-700 gap-1 text-xs"><AlertCircle className="w-3 h-3" />Expired</Badge>
            : <Badge variant="outline" className="text-muted-foreground gap-1 text-xs"><Circle className="w-3 h-3" />Not Connected</Badge>
        }
      </div>

      {isExpired && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          Connection expired — reconnect to keep sending from your address.
        </p>
      )}

      {isConnected && (
        <p className="text-xs text-muted-foreground">
          Connected as <strong>{employee.gmail_connected_email || employee.assigned_comm_email}</strong>
          {employee.gmail_connected_at && <> · {new Date(employee.gmail_connected_at).toLocaleDateString()}</>}
        </p>
      )}

      {!isConnected && !isExpired && (
        <p className="text-xs text-muted-foreground">
          Connect your @highcountrymetalworks.com Gmail to send emails from your own address.
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        {!isConnected || isExpired ? (
          <Button
            size="sm"
            variant={isExpired ? "default" : "outline"}
            className="gap-1.5 h-8 text-xs"
            onClick={handleConnect}
            disabled={connecting || !hasEmail}
          >
            {connecting ? (
              <><span className="w-3 h-3 border-2 border-t-transparent border-current rounded-full animate-spin" />Redirecting…</>
            ) : isExpired ? (
              <><RefreshCw className="w-3 h-3" />Reconnect Gmail</>
            ) : (
              <><ExternalLink className="w-3 h-3" />Connect Gmail</>
            )}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handleConnect} disabled={connecting}>
              <RefreshCw className="w-3 h-3" />Reconnect
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs text-muted-foreground" onClick={handleDisconnect} disabled={disconnecting}>
              <Unlink className="w-3 h-3" />Disconnect
            </Button>
          </>
        )}
        {!hasEmail && <p className="text-xs text-muted-foreground italic self-center">Assign a comm email first.</p>}
      </div>
    </div>
  );
}