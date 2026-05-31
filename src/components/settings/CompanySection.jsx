import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, Building2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CompanySection() {
  const [form, setForm] = useState({
    name: "High Country Metal Works",
    phone: "801-210-9103",
    email: "info@highcountrymetalworks.com",
    address: "",
    logo_url: "",
  });
  const [hours, setHours] = useState({
    Mon: { enabled: true, start: "08:00", end: "18:00" },
    Tue: { enabled: true, start: "08:00", end: "18:00" },
    Wed: { enabled: true, start: "08:00", end: "18:00" },
    Thu: { enabled: true, start: "08:00", end: "18:00" },
    Fri: { enabled: true, start: "08:00", end: "18:00" },
    Sat: { enabled: true, start: "09:00", end: "14:00" },
    Sun: { enabled: false, start: "08:00", end: "17:00" },
  });
  const [uploading, setUploading] = useState(false);

  async function handleLogoUpload(file) {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, logo_url: file_url }));
    setUploading(false);
    toast.success("Logo uploaded");
  }

  function handleSave() {
    toast.success("Company settings saved");
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
          <Input className="h-9" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Primary Phone</Label>
            <Input className="h-9" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Primary Email</Label>
            <Input className="h-9" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Business Address</Label>
          <Input className="h-9" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City, State 84000" />
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
                onCheckedChange={v => setHours(p => ({ ...p, [day]: { ...p[day], enabled: v } }))}
                className="scale-75"
              />
              <span className="w-8 text-sm font-medium">{day}</span>
              {hours[day].enabled ? (
                <>
                  <Input
                    type="time"
                    className="h-7 w-28 text-xs"
                    value={hours[day].start}
                    onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], start: e.target.value } }))}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    className="h-7 w-28 text-xs"
                    value={hours[day].end}
                    onChange={e => setHours(p => ({ ...p, [day]: { ...p[day], end: e.target.value } }))}
                  />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full sm:w-auto">Save Changes</Button>
    </div>
  );
}