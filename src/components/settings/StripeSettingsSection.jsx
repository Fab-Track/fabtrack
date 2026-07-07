import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function StripeSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(null); // { status, charges_enabled, details_submitted }

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getStripeConnectStatus", {});
      setStatus(res.data);
    } catch {
      setStatus({ status: "not_connected", charges_enabled: false, details_submitted: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke("createStripeConnectLink", {});
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || "Failed to start Stripe onboarding.");
        setConnecting(false);
      }
    } catch (err) {
      toast.error("Failed to start Stripe onboarding.");
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const connectStatus = status?.status || "not_connected";
  const isActive = connectStatus === "active";
  const isPending = connectStatus === "pending" || connectStatus === "restricted";

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="font-semibold text-base">Stripe Payments</h2>
        <p className="text-sm text-muted-foreground">
          Connect your Stripe account to accept customer invoice payments.
        </p>
      </div>

      {/* Status card */}
      <div className="border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? "bg-emerald-50" : "bg-muted"}`}>
              <CreditCard className={`w-5 h-5 ${isActive ? "text-emerald-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">Stripe</p>
              <p className="text-xs text-muted-foreground">
                {isActive ? "Connected — charges enabled" : isPending ? "Setup incomplete" : "Not connected"}
              </p>
            </div>
          </div>
          {isActive ? (
            <Badge className="bg-emerald-100 text-emerald-700 gap-1">
              <CheckCircle2 className="w-3 h-3" />Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <AlertCircle className="w-3 h-3" />{isPending ? "Pending" : "Not Connected"}
            </Badge>
          )}
        </div>
      </div>

      <div>
        {isActive ? (
          <Button variant="outline" disabled className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-4 h-4" /> Connected
          </Button>
        ) : (
          <Button onClick={handleConnect} disabled={connecting} className="gap-1.5">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            {isPending ? "Setup incomplete — finish onboarding" : "Connect with Stripe"}
          </Button>
        )}
      </div>
    </div>
  );
}