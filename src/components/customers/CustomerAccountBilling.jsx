import React, { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createFileSignedUrl } from "@/lib/fileSignedUrl";
import { Upload, FileText, Download, Loader2, ShieldCheck, FileCheck2, Phone } from "lucide-react";
import { toast } from "sonner";

const PRICING_TIERS = ["Standard", "Builder", "Designer", "Preferred"];
const CONTACT_METHODS = ["Call", "Text", "Email"];
const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Custom"];

export default function CustomerAccountBilling({ customer, onUpdated }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // "resale" | "coi" | null
  const resaleInputRef = useRef(null);
  const coiInputRef = useRef(null);

  // Local state mirrors customer fields
  const [form, setForm] = useState({
    tax_exempt: customer.tax_exempt || false,
    resale_certificate_uri: customer.resale_certificate_uri || "",
    coi_required: customer.coi_required || false,
    coi_file_uri: customer.coi_file_uri || "",
    coi_expiration: customer.coi_expiration || "",
    w9_required: customer.w9_required || false,
    preferred_contact_method: customer.preferred_contact_method || "",
    pricing_tier: customer.pricing_tier || "",
    payment_terms: customer.payment_terms || "",
    payment_terms_custom_days: customer.payment_terms_custom_days || "",
  });

  async function handleSave(updates) {
    setSaving(true);
    try {
      const updated = await base44.entities.Customer.update(customer.id, updates);
      qc.invalidateQueries({ queryKey: ["customers"] });
      onUpdated({ ...customer, ...updated });
      toast.success("Account settings saved");
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleUpload(file, field) {
    if (!file) return;
    const type = field === "resale_certificate_uri" ? "resale" : "coi";
    setUploading(type);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const updates = { [field]: file_uri };
      setForm(prev => ({ ...prev, [field]: file_uri }));
      await handleSave(updates);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleDownload(uri, filename) {
    try {
      const { signed_url } = await createFileSignedUrl(uri);
      window.open(signed_url, "_blank");
    } catch {
      toast.error("Could not open file");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-muted-foreground" /> Account & Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Pricing Tier */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs">Pricing Tier</Label>
            <p className="text-[10px] text-muted-foreground">Controls pricing level for this customer</p>
          </div>
          <Select
            value={form.pricing_tier || ""}
            onValueChange={v => { updateField("pricing_tier", v); handleSave({ pricing_tier: v }); }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Standard" />
            </SelectTrigger>
            <SelectContent>
              {PRICING_TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Preferred Contact Method */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs">Preferred Contact Method</Label>
            <p className="text-[10px] text-muted-foreground">How this customer prefers to be reached</p>
          </div>
          <Select
            value={form.preferred_contact_method || ""}
            onValueChange={v => { updateField("preferred_contact_method", v); handleSave({ preferred_contact_method: v }); }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Terms */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs">Payment Terms</Label>
            <p className="text-[10px] text-muted-foreground">Net days for invoices</p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={form.payment_terms || ""}
              onValueChange={v => { updateField("payment_terms", v); handleSave({ payment_terms: v }); }}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.payment_terms === "Custom" && (
              <Input
                type="number"
                className="w-16 h-8 text-xs"
                value={form.payment_terms_custom_days || ""}
                placeholder="Days"
                onChange={e => updateField("payment_terms_custom_days", parseInt(e.target.value) || null)}
                onBlur={() => handleSave({ payment_terms_custom_days: form.payment_terms_custom_days })}
              />
            )}
          </div>
        </div>

        {/* Tax Exempt */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <div>
            <Label className="text-xs">Tax Exempt</Label>
            <p className="text-[10px] text-muted-foreground">Customer has a resale certificate on file</p>
          </div>
          <Switch
            checked={form.tax_exempt}
            onCheckedChange={v => { updateField("tax_exempt", v); handleSave({ tax_exempt: v }); }}
          />
        </div>

        {/* Resale Certificate (only if tax_exempt) */}
        {form.tax_exempt && (
          <div className="pl-3 border-l-2 border-muted space-y-2">
            <Label className="text-xs">Resale Certificate</Label>
            {form.resale_certificate_uri ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <FileText className="w-3 h-3" /> Certificate on file
                </Badge>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => handleDownload(form.resale_certificate_uri, "resale-certificate")}>
                  <Download className="w-3 h-3" /> View
                </Button>
                <input
                  ref={resaleInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => handleUpload(e.target.files?.[0], "resale_certificate_uri")}
                />
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => resaleInputRef.current?.click()} disabled={uploading === "resale"}>
                  {uploading === "resale" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Replace"}
                </Button>
              </div>
            ) : (
              <>
                <input
                  ref={resaleInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => handleUpload(e.target.files?.[0], "resale_certificate_uri")}
                />
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => resaleInputRef.current?.click()} disabled={uploading === "resale"}>
                  {uploading === "resale" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload Certificate
                </Button>
              </>
            )}
          </div>
        )}

        {/* COI Required */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <div>
            <Label className="text-xs">COI Required</Label>
            <p className="text-[10px] text-muted-foreground">Certificate of Insurance required</p>
          </div>
          <Switch
            checked={form.coi_required}
            onCheckedChange={v => { updateField("coi_required", v); handleSave({ coi_required: v }); }}
          />
        </div>

        {/* COI File + Expiration */}
        {form.coi_required && (
          <div className="pl-3 border-l-2 border-muted space-y-2">
            <Label className="text-xs">COI Document</Label>
            {form.coi_file_uri ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <ShieldCheck className="w-3 h-3" /> COI on file
                </Badge>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => handleDownload(form.coi_file_uri, "coi")}>
                  <Download className="w-3 h-3" /> View
                </Button>
                <input
                  ref={coiInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => handleUpload(e.target.files?.[0], "coi_file_uri")}
                />
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => coiInputRef.current?.click()} disabled={uploading === "coi"}>
                  {uploading === "coi" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Replace"}
                </Button>
              </div>
            ) : (
              <>
                <input
                  ref={coiInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => handleUpload(e.target.files?.[0], "coi_file_uri")}
                />
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => coiInputRef.current?.click()} disabled={uploading === "coi"}>
                  {uploading === "coi" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload COI
                </Button>
              </>
            )}
            <div>
              <Label className="text-xs">COI Expiration</Label>
              <Input
                type="date"
                className="h-8 text-xs w-40"
                value={form.coi_expiration || ""}
                onChange={e => updateField("coi_expiration", e.target.value)}
                onBlur={() => handleSave({ coi_expiration: form.coi_expiration || null })}
              />
            </div>
          </div>
        )}

        {/* W-9 Required */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          <div>
            <Label className="text-xs">W-9 Required</Label>
            <p className="text-[10px] text-muted-foreground">Customer needs a W-9 on file</p>
          </div>
          <Switch
            checked={form.w9_required}
            onCheckedChange={v => { updateField("w9_required", v); handleSave({ w9_required: v }); }}
          />
        </div>
      </CardContent>
    </Card>
  );
}