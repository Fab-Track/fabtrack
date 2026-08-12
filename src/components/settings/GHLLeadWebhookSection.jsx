import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_PAYLOAD = `{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+15551234567",
  "job_types": ["Railing", "Gate"],
  "photo_urls": ["https://cdn.gohighlevel.com/uploads/site-photo.jpg"]
}`;

const FIELD_MAPPING = [
  { field: "name", type: "string", required: true, example: "John Smith" },
  { field: "email", type: "string", required: true, example: "john.smith@example.com" },
  { field: "phone", type: "string", required: true, example: "+15551234567" },
  { field: "job_types", type: "array of strings", required: false, example: "[\"Railing\", \"Gate\"]" },
  { field: "photo_urls", type: "array of strings (URLs)", required: false, example: "[\"https://cdn.gohighlevel.com/uploads/site-photo.jpg\"]" },
];

const VALID_JOB_TYPES = "Fence, Gate, Railing, Staircase, Custom Structure, Other";

function SpecSection({ number, title, children }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{number}</span>
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function CopyButton({ onCopy, label, copied }) {
  return (
    <Button size="sm" variant="outline" onClick={onCopy} className="gap-1.5 shrink-0 h-7 text-xs">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export default function GHLLeadWebhookSection() {
  const { user } = useAuth();
  const orgId = user?.organization_id || "";
  const [urlCopied, setUrlCopied] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);

  const appId = import.meta.env.VITE_BASE44_APP_ID || "YOUR_APP_ID";
  const webhookUrl = orgId
    ? `https://api.base44.com/v1/apps/${appId}/functions/receiveGHLLead?org_id=${orgId}`
    : "Sign in to generate your webhook URL";

  function copyUrl() {
    if (!orgId) {
      toast.error("Organization ID not found");
      return;
    }
    navigator.clipboard.writeText(webhookUrl);
    setUrlCopied(true);
    toast.success("Endpoint URL copied to clipboard");
    setTimeout(() => setUrlCopied(false), 2000);
  }

  function copyPayload() {
    navigator.clipboard.writeText(SAMPLE_PAYLOAD);
    setPayloadCopied(true);
    toast.success("Sample payload copied to clipboard");
    setTimeout(() => setPayloadCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
          <Globe className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">GoHighLevel Lead Webhook</h3>
          <p className="text-xs text-muted-foreground">Complete integration spec — copy into GoHighLevel Workflows</p>
        </div>
        <Badge className="ml-auto gap-1 bg-green-100 text-green-700 border-green-200">Active</Badge>
      </div>

      {/* 1. Endpoint URL */}
      <SpecSection number={1} title="Endpoint URL">
        <p className="text-xs text-muted-foreground">Paste this into the GHL Workflow webhook action URL field.</p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 bg-muted rounded-md px-3 py-2 text-xs font-mono break-all">{webhookUrl}</code>
          <CopyButton onCopy={copyUrl} label="Copy URL" copied={urlCopied} />
        </div>
      </SpecSection>

      {/* 2. HTTP Method */}
      <SpecSection number={2} title="HTTP Method">
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-mono">POST</Badge>
          <span className="text-xs text-muted-foreground">All webhook requests must use the POST method.</span>
        </div>
      </SpecSection>

      {/* 3. Authentication */}
      <SpecSection number={3} title="Authentication">
        <p className="text-xs text-muted-foreground">No authentication required. The <code className="font-mono bg-muted px-1 rounded">org_id</code> query parameter in the endpoint URL scopes all created records to your organization. No API key, bearer token, or OAuth flow is needed.</p>
      </SpecSection>

      {/* 4. Required Headers */}
      <SpecSection number={4} title="Required Headers">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Header Name</th>
                <th className="text-left px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-3 py-2 font-mono">Content-Type</td>
                <td className="px-3 py-2 font-mono">application/json</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">The request body must be valid JSON. Set this header in the GHL webhook action or ensure the body type is set to JSON.</p>
      </SpecSection>

      {/* 5. Field Mapping */}
      <SpecSection number={5} title="Field Mapping">
        <p className="text-xs text-muted-foreground">Map your GoHighLevel form fields to these exact payload keys. All field names are case-sensitive.</p>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Field Name</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-left px-3 py-2 font-medium">Required</th>
                <th className="text-left px-3 py-2 font-medium">Example Value</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_MAPPING.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 font-mono">{row.field}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.type}</td>
                  <td className="px-3 py-2">
                    {row.required
                      ? <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Required</Badge>
                      : <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground break-all">{row.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-xs">
          <p className="font-medium mb-1">Valid values for <code className="font-mono">job_types</code> array items:</p>
          <p className="font-mono text-muted-foreground">{VALID_JOB_TYPES}</p>
        </div>
      </SpecSection>

      {/* 6. Sample JSON Body */}
      <SpecSection number={6} title="Sample JSON Body">
        <p className="text-xs text-muted-foreground">Copy this directly into GoHighLevel's webhook custom body builder. Replace the example values with your mapped GHL custom values.</p>
        <div className="relative">
          <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto pr-24">{SAMPLE_PAYLOAD}</pre>
          <div className="absolute top-2 right-2">
            <CopyButton onCopy={copyPayload} label="Copy Payload" copied={payloadCopied} />
          </div>
        </div>
      </SpecSection>

      {/* 7. Testing */}
      <SpecSection number={7} title="Testing">
        <p className="text-xs text-muted-foreground">There is no sandbox or test endpoint. To verify your integration:</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside ml-1">
          <li>Publish your GHL Workflow with the webhook action configured.</li>
          <li>Submit a real lead through your website form.</li>
          <li>Open FabTrack → <strong>Sales board → New Lead</strong> — your test lead should appear within seconds as a new job card.</li>
        </ol>
      </SpecSection>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
        <strong>Security note:</strong> This webhook is not protected by a shared secret. Anyone with the URL above can submit leads to your pipeline. To add a shared secret for verification, ask your developer to set up the <code className="font-mono bg-amber-100 px-1 rounded">GHL_WEBHOOK_SECRET</code> environment variable.
      </div>
    </div>
  );
}