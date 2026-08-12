import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Globe, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function GHLLeadWebhookSection() {
  const { user } = useAuth();
  const orgId = user?.organization_id || "";
  const [copied, setCopied] = useState(false);

  // The public function URL — admin gets the exact endpoint from the Base44 dashboard
  // (dashboard → code → functions → receiveGHLLead). We construct the pattern here
  // and append the org_id query param so leads land in the right org.
  const webhookUrl = orgId
    ? `https://api.base44.com/v1/apps/${import.meta.env.VITE_BASE44_APP_ID || "YOUR_APP_ID"}/functions/receiveGHLLead?org_id=${orgId}`
    : "Sign in to generate your webhook URL";

  function handleCopy() {
    if (!orgId) {
      toast.error("Organization ID not found");
      return;
    }
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  const fieldMapping = [
    { ghl: "Full Name", fabtrack: "name", required: true },
    { ghl: "Email", fabtrack: "email", required: true },
    { ghl: "Phone", fabtrack: "phone", required: true },
    { ghl: "Job Type (multi-select)", fabtrack: "job_types (array)", required: false },
    { ghl: "File Upload (photos)", fabtrack: "photo_urls (array)", required: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
          <Globe className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">GoHighLevel Lead Webhook</h3>
          <p className="text-xs text-muted-foreground">Auto-create jobs on the Sales board from website leads</p>
        </div>
        <Badge className="ml-auto gap-1 bg-green-100 text-green-700 border-green-200">Active</Badge>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 text-xs text-blue-900">
        <p className="font-semibold">How it works</p>
        <p>When a lead submits your GoHighLevel form, GHL fires a POST webhook to the URL below. FabTrack automatically creates a <strong>Customer record</strong> and a <strong>Job card</strong> on the Sales pipeline (New Lead stage), then notifies your admin, owner, and estimator roles in-app.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Your Webhook URL</Label>
        <div className="flex gap-2">
          <Input
            className="h-8 text-xs font-mono"
            value={webhookUrl}
            readOnly
          />
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 shrink-0">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste this into GoHighLevel → Workflows → your form workflow → add a <strong>Webhook</strong> action → set method to <strong>POST</strong> and paste this URL.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Field Mapping (configure in GHL Workflow → Webhook → Custom Headers/Body)</Label>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">GoHighLevel Field</th>
                <th className="text-left px-3 py-2 font-medium">FabTrack Payload Key</th>
                <th className="text-left px-3 py-2 font-medium">Required</th>
              </tr>
            </thead>
            <tbody>
              {fieldMapping.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{row.ghl}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{row.fabtrack}</td>
                  <td className="px-3 py-2">
                    {row.required
                      ? <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Required</Badge>
                      : <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Send the payload as JSON in the request body. Example:
        </p>
        <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
{`{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+15551234567",
  "job_types": ["Railing", "Gate"],
  "photo_urls": ["https://gdl-url.com/file1.jpg"]
}`}
        </pre>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
        <strong>Security note:</strong> This webhook is not protected by a shared secret. Anyone with the URL above can submit leads to your pipeline. To add a shared secret for verification, ask me to set up the <code className="font-mono bg-amber-100 px-1 rounded">GHL_WEBHOOK_SECRET</code> environment variable.
      </div>
    </div>
  );
}