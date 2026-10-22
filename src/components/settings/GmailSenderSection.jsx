import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertCircle, Circle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

function StatusBadge({ status }) {
  if (status === "connected")
    return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3" />Connected</Badge>;
  if (status === "expired")
    return <Badge className="gap-1 bg-amber-100 text-amber-700 border-amber-200"><AlertCircle className="w-3 h-3" />Expired — Reconnect</Badge>;
  if (status === "error")
    return <Badge className="gap-1 bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3" />Error</Badge>;
  return <Badge variant="outline" className="gap-1 text-muted-foreground"><Circle className="w-3 h-3" />Not Connected</Badge>;
}

export default function GmailSenderSection({ onStatusChange }) {
  const [status, setStatus] = useState("disconnected");
  const [email, setEmail] = useState("");
  const [connectedAt, setConnectedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const resp = await base44.functions.invoke("gmailGetStatus", {});
      const sys = resp.data?.system_sender;
      if (sys) {
        setStatus(sys.status || "disconnected");
        setEmail(sys.email || "");
        setConnectedAt(sys.connected_at || null);
        onStatusChange?.(sys.status || "disconnected");
      }
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Poll for connection result when OAuth tab is open
  useEffect(() => {
    if (!connecting) return;
    const interval = setInterval(fetchStatus, 2500);
    const timeout = setTimeout(() => {
      setConnecting(false);
      clearInterval(interval);
    }, 120000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [connecting, fetchStatus]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const resp = await base44.functions.invoke("gmailOAuthStart", { type: "system" });
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
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect the company Gmail sender? Email will revert to Resend if configured.")) return;
    setDisconnecting(true);
    try {
      const resp = await base44.functions.invoke("gmailDisconnect", { type: "system" });
      if (resp.data?.ok) {
        setStatus("disconnected");
        setEmail("");
        setConnectedAt(null);
        onStatusChange?.("disconnected");
        toast.success("Gmail disconnected");
      } else {
        toast.error(resp.data?.error || "Failed to disconnect");
      }
    } catch (err) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Checking Gmail status…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Gmail (Company Sender)</h3>
            <p className="text-xs text-muted-foreground">
              Send estimates and invoices from your company Gmail address
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === "connected" && email && (
        <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          <div>
            <p className="text-xs font-medium text-green-800">{email}</p>
            {connectedAt && (
              <p className="text-[10px] text-green-600">
                Connected {new Date(connectedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleDisconnect} disabled={disconnecting} className="gap-1.5 h-7 text-xs">
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      )}

      {status !== "connected" && (
        <>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
            Connect your company Gmail account to send customer-facing emails directly from Gmail.
            FabTrack uses Google OAuth — your credentials are never stored as plain text.
          </div>
          <Button size="sm" onClick={handleConnect} disabled={connecting} className="gap-1.5">
            {connecting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Waiting for authorization…</>
            ) : (
              <><Mail className="w-3.5 h-3.5" />Connect Gmail</>
            )}
          </Button>
          {connecting && (
            <p className="text-[10px] text-muted-foreground">
              A new tab opened for Google authorization. This page will update automatically once connected.
            </p>
          )}
        </>
      )}
    </div>
  );
}