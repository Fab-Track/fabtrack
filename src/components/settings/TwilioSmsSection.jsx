import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle2, AlertCircle, Circle, Eye, EyeOff, Send, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

function StatusBadge({ status }) {
  if (status === "connected")
    return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3" />Connected</Badge>;
  if (status === "error")
    return <Badge className="gap-1 bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3" />Error</Badge>;
  return <Badge variant="outline" className="gap-1 text-muted-foreground"><Circle className="w-3 h-3" />Not Connected</Badge>;
}

const TWILIO_SETTING_KEY = "twilio";

export default function TwilioSmsSection({ onStatusChange }) {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState("not_connected");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");

  const fetchConfig = useCallback(async () => {
    try {
      const records = await base44.entities.AppSettings.filter({ setting_key: TWILIO_SETTING_KEY });
      const config = records?.[0];
      if (config) {
        setAccountSid(config.twilio_account_sid || "");
        setAuthToken(config.twilio_auth_token || "");
        setFromNumber(config.twilio_from_number || "");
        setStatus(config.twilio_status || (config.twilio_account_sid ? "connected" : "not_connected"));
        onStatusChange?.(config.twilio_status === "connected" ? "connected" : "not_connected");
      }
    } catch {
      /* non-fatal */
    } finally {
      setLoaded(true);
    }
  }, [onStatusChange]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  async function handleSave() {
    if (!accountSid || !authToken || !fromNumber) {
      toast.error("Account SID, Auth Token, and From Number are all required");
      return;
    }
    setSaving(true);
    try {
      const resp = await base44.functions.invoke("saveTwilioConfig", {
        action: "save",
        account_sid: accountSid,
        auth_token: authToken,
        from_number: fromNumber,
      });
      if (resp.data?.ok) {
        setStatus(resp.data.twilio_status || "connected");
        onStatusChange?.(resp.data.twilio_status || "connected");
        toast.success("Twilio credentials saved");
      } else {
        toast.error(resp.data?.error || "Failed to save");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testTo) { toast.error("Enter a test phone number"); return; }
    setTesting(true);
    try {
      const resp = await base44.functions.invoke("saveTwilioConfig", {
        action: "test",
        test_to: testTo,
      });
      if (resp.data?.ok) {
        setStatus("connected");
        onStatusChange?.("connected");
        toast.success("Test SMS sent!");
      } else {
        setStatus("error");
        toast.error(resp.data?.error || "Test failed — check your credentials");
      }
    } catch (err) {
      setStatus("error");
      toast.error(err.message || "Test failed");
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Remove Twilio credentials for this organization?")) return;
    setSaving(true);
    try {
      const resp = await base44.functions.invoke("saveTwilioConfig", { action: "disconnect" });
      if (resp.data?.ok) {
        setAccountSid("");
        setAuthToken("");
        setFromNumber("");
        setStatus("not_connected");
        onStatusChange?.("not_connected");
        toast.success("Twilio credentials removed");
      }
    } catch (err) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Checking Twilio status…</span>
      </div>
    );
  }

  const isConnected = status === "connected";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <Phone className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Twilio SMS</h3>
            <p className="text-xs text-muted-foreground">Send SMS from your organization's Twilio account</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
        Enter your organization's Twilio credentials. These are stored securely per shop and used only for your messages.
        {" "}
        <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:text-blue-600">
          Twilio Console <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid gap-3">
        <div>
          <Label className="text-xs">Account SID</Label>
          <Input
            className="h-8 text-sm font-mono"
            value={accountSid}
            onChange={e => setAccountSid(e.target.value)}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </div>
        <div>
          <Label className="text-xs">Auth Token</Label>
          <div className="relative">
            <Input
              className="h-8 text-sm font-mono pr-8"
              type={showToken ? "text" : "password"}
              value={authToken}
              onChange={e => setAuthToken(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
            />
            <button onClick={() => setShowToken(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div>
          <Label className="text-xs">Primary SMS Number (E.164 format)</Label>
          <Input
            className="h-8 text-sm"
            value={fromNumber}
            onChange={e => setFromNumber(e.target.value)}
            placeholder="+18012109103"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !accountSid || !authToken || !fromNumber} className="gap-1.5 shrink-0">
          {saving ? "Saving…" : "Save"}
        </Button>
        {isConnected && (
          <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={saving} className="gap-1.5 shrink-0 text-destructive hover:text-destructive">
            Disconnect
          </Button>
        )}
        <div className="flex gap-2 items-center flex-1 min-w-[200px]">
          <Input className="h-8 text-sm" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="Test number: +1..." />
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !testTo} className="gap-1.5 shrink-0">
            <Send className="w-3.5 h-3.5" />{testing ? "Sending…" : "Test SMS"}
          </Button>
        </div>
      </div>
    </div>
  );
}