import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function StripeSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [status, setStatus] = useState(null); // { is_connected, mode, connected_at }

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getStripeStatus", {});
      setStatus(res.data);
    } catch {
      setStatus({ is_connected: false, mode: "", connected_at: null });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleSave() {
    if (!secretKey.trim()) {
      toast.error("Please enter your Stripe secret key.");
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("saveStripeSettings", {
        stripe_secret_key: secretKey.trim(),
        stripe_webhook_secret: webhookSecret.trim() || undefined,
      });
      if (res.data?.success) {
        toast.success(`Stripe connected (${res.data.mode} mode)`);
        setSecretKey("");
        setWebhookSecret("");
        await fetchStatus();
      } else {
        toast.error(res.data?.error || "Failed to save Stripe settings.");
      }
    } catch (err) {
      toast.error("Failed to save. Please try again.");
    }
    setSaving(false);
  }

  async function handleDisconnect() {
    setSaving(true);
    try {
      await base44.functions.invoke("saveStripeSettings", {
        stripe_secret_key: "",
        stripe_webhook_secret: "",
      });
      toast.success("Stripe disconnected.");
      await fetchStatus();
    } catch {
      toast.error("Failed to disconnect.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const isConnected = status?.is_connected;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="font-semibold text-base">Stripe Payments</h2>
        <p className="text-sm text-muted-foreground">
          Connect your Stripe account to accept credit card payments on customer invoices.
        </p>
      </div>

      {/* Status card */}
      <div className="border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isConnected ? "bg-emerald-50" : "bg-muted"}`}>
              <CreditCard className={`w-5 h-5 ${isConnected ? "text-emerald-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">Stripe</p>
              <p className="text-xs text-muted-foreground">
                {isConnected
                  ? `Connected in ${status.mode} mode`
                  : "Not connected"}
              </p>
            </div>
          </div>
          {isConnected ? (
            <Badge className="bg-emerald-100 text-emerald-700 gap-1">
              <CheckCircle2 className="w-3 h-3" />Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <AlertCircle className="w-3 h-3" />Not Connected
            </Badge>
          )}
        </div>

        {isConnected && status.connected_at && (
          <p className="text-xs text-muted-foreground">
            Connected on {new Date(status.connected_at).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
            })}
          </p>
        )}

        {isConnected && !status.has_webhook_secret && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Webhook not configured.</strong> Payments will process but invoice status may not update automatically.
            Add your webhook signing secret below.
          </div>
        )}
      </div>

      {/* Setup instructions */}
      {!isConnected && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 space-y-2">
          <p><strong>How to connect Stripe:</strong></p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>
              Go to your{" "}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline hover:text-blue-600">
                Stripe Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Copy your <strong>secret key</strong> (starts with <code className="font-mono bg-blue-100 px-1 rounded">sk_live_</code> or <code className="font-mono bg-blue-100 px-1 rounded">sk_test_</code>)</li>
            <li>Create a webhook endpoint in Stripe for <code className="font-mono bg-blue-100 px-1 rounded">checkout.session.completed</code> events</li>
            <li>Copy the <strong>webhook signing secret</strong> (starts with <code className="font-mono bg-blue-100 px-1 rounded">whsec_</code>)</li>
            <li>Enter both keys below and click Save</li>
          </ol>
        </div>
      )}

      {/* Key inputs */}
      <div className="space-y-4">
        <div>
          <Label className="text-xs">Stripe Secret Key</Label>
          <div className="relative mt-1">
            <Input
              className="h-9 text-sm font-mono pr-9"
              type={showKey ? "text" : "password"}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={isConnected ? "••••••••••••••••••••••••••• (enter new key to replace)" : "sk_live_xxxxxxxxxxxxxxxxxxxx"}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Use <code className="font-mono bg-muted px-1 rounded text-[11px]">sk_test_</code> for testing,{" "}
            <code className="font-mono bg-muted px-1 rounded text-[11px]">sk_live_</code> for real payments.
          </p>
        </div>

        <div>
          <Label className="text-xs">Webhook Signing Secret (optional but recommended)</Label>
          <div className="relative mt-1">
            <Input
              className="h-9 text-sm font-mono pr-9"
              type={showWebhook ? "text" : "password"}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={isConnected && status.has_webhook_secret ? "•••••••••••••••••• (enter new to replace)" : "whsec_xxxxxxxxxxxxxxxxxxxx"}
            />
            <button
              type="button"
              onClick={() => setShowWebhook((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Required for automatic invoice status updates after payment. Get this from your Stripe webhook settings.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !secretKey.trim()} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {isConnected ? "Update Keys" : "Connect Stripe"}
        </Button>
        {isConnected && (
          <Button variant="outline" onClick={handleDisconnect} disabled={saving} className="text-destructive hover:text-destructive">
            Disconnect
          </Button>
        )}
      </div>

      <Separator />

      <div className="text-xs text-muted-foreground space-y-1">
        <p>Your Stripe keys are encrypted at rest and never exposed to customers or non-admin users.</p>
        <p>
          Need help?{" "}
          <a href="https://docs.stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground inline-flex items-center gap-0.5">
            Stripe Docs <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
}