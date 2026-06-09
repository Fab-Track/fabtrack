import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SETTING_KEY = "estimate_settings";

const DEFAULT_CONTRACT = `TERMS AND CONDITIONS

By signing this estimate, you ("Customer") agree to authorize High Country Metal Works ("Company") to proceed with the scope of work described above at the agreed-upon price.

1. SCOPE OF WORK — Work is limited to the items described in this estimate. Any changes must be submitted as a written Change Order and approved by both parties before additional work begins.

2. PAYMENT TERMS — A 50% deposit is due before fabrication begins. The remaining 50% balance is due upon project completion, before or at the time of installation.

3. MATERIALS — All materials will be sourced and fabricated by the Company. Substitutions may occur if materials are unavailable, with equivalent quality maintained.

4. TIMELINE — Project timelines are estimates only. The Company is not liable for delays caused by supply chain issues, weather, or circumstances outside our control.

5. WARRANTIES — The Company warrants all workmanship for one (1) year from the date of installation. Material warranties are subject to manufacturer terms.

6. APPROVAL — Your digital signature below constitutes a legally binding agreement to the terms above and authorizes the Company to begin work upon receipt of the required deposit.`;

export default function EstimateContractSection() {
  const qc = useQueryClient();
  const [contractText, setContractText] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [recordId, setRecordId] = useState(null);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["appSettings", SETTING_KEY],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: SETTING_KEY }),
  });

  useEffect(() => {
    if (settings.length > 0) {
      const rec = settings[0];
      setRecordId(rec.id);
      setContractText(rec.estimate_contract_text || DEFAULT_CONTRACT);
      setEmailEnabled(rec.estimate_approval_email_enabled || false);
    } else {
      setContractText(DEFAULT_CONTRACT);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        setting_key: SETTING_KEY,
        estimate_contract_text: contractText,
        estimate_approval_email_enabled: emailEnabled,
      };
      return recordId
        ? base44.entities.AppSettings.update(recordId, payload)
        : base44.entities.AppSettings.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries(["appSettings", SETTING_KEY]);
      toast.success("Contract settings saved");
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-base">Estimate Approval Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Customize the contract language shown to customers before they sign an estimate, and control email notifications.</p>
      </div>

      {/* Email notification toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p className="text-sm font-medium">Email notification on approval</p>
          <p className="text-xs text-muted-foreground mt-0.5">Send an email to the job owner when an estimate is approved by any method.</p>
        </div>
        <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
      </div>

      {/* Contract text editor */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Customer Contract / Terms Language</Label>
        <p className="text-xs text-muted-foreground">This text is shown to customers in a scrollable block above the signature field on the shareable estimate link. They must scroll through it before they can sign.</p>
        <Textarea
          rows={16}
          value={contractText}
          onChange={e => setContractText(e.target.value)}
          className="text-xs font-mono leading-relaxed"
          placeholder="Enter your contract terms here…"
        />
      </div>

      <div className="flex gap-3">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={() => setContractText(DEFAULT_CONTRACT)}>
          Reset to Default
        </Button>
      </div>
    </div>
  );
}