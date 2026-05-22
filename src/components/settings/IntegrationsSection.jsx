import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, CheckCircle2, AlertCircle, Circle, ExternalLink, Eye, EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

function StatusDot({ status }) {
  if (status === "connected") return <Badge className="gap-1 bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3" />Connected</Badge>;
  if (status === "error") return <Badge className="gap-1 bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3" />Error</Badge>;
  return <Badge variant="outline" className="gap-1 text-muted-foreground"><Circle className="w-3 h-3" />Not Connected</Badge>;
}

export default function IntegrationsSection() {
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioFrom, setTwilioFrom] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [twilioStatus, setTwilioStatus] = useState("not_connected"); // not_connected | connected | error
  const [testing, setTesting] = useState(false);

  const [sendgridKey, setSendgridKey] = useState("");
  const [showSendgridKey, setShowSendgridKey] = useState(false);
  const [sendgridFrom, setSendgridFrom] = useState("cole@highcountrymetalworks.com");
  const [sendgridFromName, setSendgridFromName] = useState("Cole @ High Country Metal Works");
  const [sgStatus, setSgStatus] = useState("not_connected");

  async function handleTestSMS() {
    if (!testNumber) { toast.error("Enter a test phone number"); return; }
    setTesting(true);
    const resp = await base44.functions.invoke("sendCustomerMessage", {
      channel: "SMS",
      to_phone: testNumber,
      from_phone: twilioFrom || "(801) 210-9103",
      from_name: "HCMW Test",
      message_body: "✅ Test SMS from FabTrack — Twilio is connected!",
    });
    setTesting(false);
    if (resp.data?.ok) {
      if (resp.data?.simulated) {
        toast.info("Simulated send (Twilio credentials not saved yet). Save them via Settings → Environment Variables first.");
      } else {
        setTwilioStatus("connected");
        toast.success("Test SMS sent!");
      }
    } else {
      setTwilioStatus("error");
      toast.error("Test failed: " + (resp.data?.error || "Check credentials"));
    }
  }

  return (
    <div className="space-y-8">
      {/* Twilio SMS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Phone className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Twilio SMS</h3>
              <p className="text-xs text-muted-foreground">Send SMS messages to customers</p>
            </div>
          </div>
          <StatusDot status={twilioStatus} />
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
          <strong>Setup instructions:</strong> Add your Twilio credentials as environment variables in your Base44 dashboard: <code className="font-mono bg-blue-100 px-1 rounded">TWILIO_ACCOUNT_SID</code>, <code className="font-mono bg-blue-100 px-1 rounded">TWILIO_AUTH_TOKEN</code>, and <code className="font-mono bg-blue-100 px-1 rounded">TWILIO_FROM_NUMBER</code>.
          <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-1 underline hover:text-blue-600">Twilio Console <ExternalLink className="w-3 h-3" /></a>
        </div>

        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Account SID</Label>
            <Input className="h-8 text-sm font-mono" value={twilioSid} onChange={e => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
          </div>
          <div>
            <Label className="text-xs">Auth Token</Label>
            <div className="relative">
              <Input
                className="h-8 text-sm font-mono pr-8"
                type={showToken ? "text" : "password"}
                value={twilioToken}
                onChange={e => setTwilioToken(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
              />
              <button onClick={() => setShowToken(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Primary SMS Number (E.164 format)</Label>
            <Input className="h-8 text-sm" value={twilioFrom} onChange={e => setTwilioFrom(e.target.value)} placeholder="+18012109103" />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Input className="h-8 text-sm flex-1" value={testNumber} onChange={e => setTestNumber(e.target.value)} placeholder="Test number: +1..." />
          <Button size="sm" variant="outline" onClick={handleTestSMS} disabled={testing} className="gap-1.5 shrink-0">
            <Send className="w-3.5 h-3.5" />{testing ? "Sending…" : "Test SMS"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          <a href="#" className="underline">Need help? View SMS setup guide →</a>
        </p>
      </div>

      <Separator />

      {/* SendGrid Email */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">SendGrid Email</h3>
              <p className="text-xs text-muted-foreground">Send emails from your domain (e.g. cole@highcountrymetalworks.com)</p>
            </div>
          </div>
          <StatusDot status={sgStatus} />
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
          <strong>Setup:</strong> Add <code className="font-mono bg-amber-100 px-1 rounded">SENDGRID_API_KEY</code> to your environment variables. Until configured, emails fall back to FabTrack's built-in sender.
          <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-1 underline">SendGrid API Keys <ExternalLink className="w-3 h-3" /></a>
        </div>

        <div className="grid gap-3">
          <div>
            <Label className="text-xs">SendGrid API Key</Label>
            <div className="relative">
              <Input
                className="h-8 text-sm font-mono pr-8"
                type={showSendgridKey ? "text" : "password"}
                value={sendgridKey}
                onChange={e => setSendgridKey(e.target.value)}
                placeholder="SG.xxxxxxxxxx"
              />
              <button onClick={() => setShowSendgridKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showSendgridKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Default From Email</Label>
              <Input className="h-8 text-sm" value={sendgridFrom} onChange={e => setSendgridFrom(e.target.value)} placeholder="info@yourcompany.com" />
            </div>
            <div>
              <Label className="text-xs">From Name</Label>
              <Input className="h-8 text-sm" value={sendgridFromName} onChange={e => setSendgridFromName(e.target.value)} placeholder="HCMW" />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Domain authentication required in SendGrid for reliable delivery from your domain.</p>
      </div>
    </div>
  );
}