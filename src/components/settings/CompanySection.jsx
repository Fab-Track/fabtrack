import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, Building2, Loader2, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useAutosave } from "@/hooks/useAutosave";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_HOURS = {
  Mon: { enabled: true, start: "08:00", end: "18:00" },
  Tue: { enabled: true, start: "08:00", end: "18:00" },
  Wed: { enabled: true, start: "08:00", end: "18:00" },
  Thu: { enabled: true, start: "08:00", end: "18:00" },
  Fri: { enabled: true, start: "08:00", end: "18:00" },
  Sat: { enabled: true, start: "09:00", end: "14:00" },
  Sun: { enabled: false, start: "08:00", end: "17:00" },
};

export default function CompanySection() {
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    logo_url: "",
  });
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [uploading, setUploading] = useState(false);

  const updateForm = (updater) => { setDirty(true); setForm(updater); };
  const updateHours = (updater) => { setDirty(true); setHours(updater); };

  // Load org + business hours on mount
  useEffect(() => {
    async function load() {
      try {
        const user = await base44.auth.me();
        if (!user?.organization_id) {
          setLoading(false);
          return;
        }
        setOrgId(user.organization_id);

        const org = await base44.entities.Organization.get(user.organization_id);
        setForm({
          name: org.name || "",
          phone: org.phone || "",
          email: org.email || "",
          address: org.address || "",
          logo_url: org.logo_url || "",
        });

        // Load business hours from AppSettings
        const settings = await base44.entities.AppSettings.filter({
          organization_id: user.organization_id,
          setting_key: "business_hours",
        }, null, 1);
        if (settings.length > 0 && settings[0].business_hours) {
          setHours(settings[0].business_hours);
        }
      } catch {
        toast.error("Failed to load company settings");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogoUpload(file) {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateForm(p => ({ ...p, logo_url: file_url }));
      toast.success("Logo uploaded");
    } catch {
      toast.error("Logo upload failed");
    }
    setUploading(false);
  }

  const enabled = !!orgId && !!form.name?.trim();

  const onSave = async (formData) => {
    if (!orgId) return;
    // Save org fields
    await base44.entities.Organization.update(orgId, {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      logo_url: formData.logo_url,
    });
    // Save business hours to AppSettings
    const existing = await base44.entities.AppSettings.filter({
      organization_id: orgId,
      setting_key: "business_hours",
    }, null, 1);
    if (existing.length > 0) {
      await base44.entities.AppSettings.update(existing[0].id, { business_hours: formData.hours });
    } else {
      await base44.entities.AppSettings.create({
        organization_id: orgId,
        setting_key: "business_hours",
        business_hours: formData.hours,
      });
    }
  };

  const { isSaving, saveNow } = useAutosave({
    data: { ...form, hours },
    dirty,
    onSave,
    onSaved: () => setDirty(false),
    enabled,
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-semibold text-base">Company</h2>
        <p className="text-sm text-muted-foreground">This information appears on estimates, invoices, and the customer portal.</p>
      </div>

      <div className="grid gap-4">
        <div>
          <Label className="text-xs">Company Name</Label>
          <Input className="h-9" value={form.name} onChange={e => updateForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Primary Phone</Label>
            <PhoneInput className="h-9" value={form.phone} onChange={e => updateForm(p => ({ ...p, phone: e.target.value }))} placeholder="000-000-0000" />
          </div>
          <div>
            <Label className="text-xs">Primary Email</Label>
            <Input className="h-9" type="email" value={form.email} onChange={e => updateForm(p => ({ ...p, email: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Business Address</Label>
          <Input className="h-9" value={form.address} onChange={e => updateForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City, State 84000" />
        </div>

        {/* Logo */}
        <div>
          <Label className="text-xs">Company Logo</Label>
          <div className="flex items-center gap-3 mt-1">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-12 w-auto rounded border object-contain bg-muted/20 px-2" />
            ) : (
              <div className="h-12 w-24 rounded border border-dashed bg-muted/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-muted-foreground/40" />
              </div>
            )}
            <Label className="cursor-pointer">
              <div className="h-8 px-3 text-xs rounded-md border border-input flex items-center gap-1.5 hover:bg-muted transition-colors">
                {uploading ? <><span className="w-3 h-3 border-2 border-t-transparent border-primary rounded-full animate-spin" />Uploading…</> : <><Upload className="w-3 h-3" />{form.logo_url ? "Replace Logo" : "Upload Logo"}</>}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); }} />
            </Label>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div>
        <h3 className="font-medium text-sm mb-1">Business Hours</h3>
        <p className="text-xs text-muted-foreground mb-3">Automated notifications (overdue reminders, install day reminders) only fire during these hours.</p>
        <div className="space-y-2">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-3">
              <Switch
                checked={hours[day].enabled}
                onCheckedChange={v => updateHours(p => ({ ...p, [day]: { ...p[day], enabled: v } }))}
                className="scale-75"
              />
              <span className="w-8 text-sm font-medium">{day}</span>
              {hours[day].enabled ? (
                <>
                  <Input
                    type="time"
                    className="h-7 w-28 text-xs"
                    value={hours[day].start}
                    onChange={e => updateHours(p => ({ ...p, [day]: { ...p[day], start: e.target.value } }))}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    className="h-7 w-28 text-xs"
                    value={hours[day].end}
                    onChange={e => updateHours(p => ({ ...p, [day]: { ...p[day], end: e.target.value } }))}
                  />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isSaving ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
          </span>
        ) : dirty ? (
          <Button onClick={saveNow} className="gap-1.5" disabled={!form.name?.trim()}>
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}