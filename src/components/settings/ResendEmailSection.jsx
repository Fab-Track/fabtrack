import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertCircle, Circle, Eye, EyeOff, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

function StatusDot({ status }) {
  if (status === "connected") return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3" />Connected</Badge>;
  if (status === "error") return <Badge className="gap-1 bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3" />Error</Badge>;
  return <Badge variant="outline" className="gap-1 text-muted-foreground"><Circle className="w-3 h-3" />Not Connected</Badge>;
}

export default function ResendEmailSection() {
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [status, setStatus] = useState("disconnected");
  const [showKey, setShowKey] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const records = await base44.entities.AppSettings.filter({ setting_key: "email" });
        const config = records?.[0];
        if (!cancelled && config) {
          setApiKey(config.resend_api_key || "");
          setFromEmail(config.resend_from_email || "");
          setFromName(config.resend_from_name || "");
          setStatus(config.email_status || "disconnected");
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    if (!apiKey || !fromEmail) {
      toast.error("API key and from-email are required");
      return;
    }
    setSaving(true);
    try {
      const resp = await base44.functions.invoke("saveEmailConfig", {
        action: "save",
        resend_api_key: apiKey,
        resend_from_email: fromEmail,
        resend_from_name: fromName,
      });
      if (resp.data?.ok) {
        setStatus(resp.data.email_status || "connected");
        toast.success("Email configuration saved.");
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
    if (!testTo) { toast.error("Enter a test recipient email"); return; }
    setTesting(true);
    try {
      const resp = await base44.functions.invoke("saveEmailConfig", {
        action: "test",
        test_to: testTo,
        resend_api_key: apiKey || undefined,
        resend_from_email: fromEmail || undefined,
        resend_from_name: fromName || undefined,
      });
      if (resp.data?.ok) {
        setStatus("connected");
        toast.success("Test email sent! Check the inbox.");
      } else {
        setStatus("error");
        toast.error(resp.data?.error || "Test failed — check your API key and domain verification.");
      }
    } catch (err) {
      setStatus("error");
      toast.error(err.message || "Test failed");
    } finally {
      setTesting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 bg-muted rounded" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Company Email (Resend)</h3>
            <p className="text-xs text-muted-foreground">Send estimates, invoices, and notifications from your domain</p>
          </div>
        </div>
        <StatusDot status={status} />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
        <strong>Setup:</strong> Create a free Resend account, verify your sending domain, and generate an API key.
        {' '}
        <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:text-blue-600">
          Resend API Keys <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid gap-3">
        <div>
          <Label className="text-xs">Resend API Key</Label>
          <div className="relative">
            <Input
              className="h-8 text-sm font-mono pr-8"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="re_..."
            />
            <button onClick={() => setShowKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">From Email (verified domain)</Label>
            <Input className="h-8 text-sm" value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="billing@yourcompany.com" />
          </div>
          <div>
            <Label className="text-xs">From Name</Label>
            <Input className="h-8 text-sm" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your Company" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !apiKey || !fromEmail} className="gap-1.5 shrink-0">
          {saving ? "Saving…" : "Save"}
        </Button>
        <Input className="h-8 text-sm flex-1" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="Test recipient: name@email.com" />
        <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !testTo} className="gap-1.5 shrink-0">
          <Send className="w-3.5 h-3.5" />{testing ? "Sending…" : "Send Test"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        The from-address domain must be verified in your Resend account for reliable delivery.
      </p>
    </div>
  );
}