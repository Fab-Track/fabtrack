import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Save } from "lucide-react";

const TSHIRT_SIZES = ["XS","S","M","L","XL","XXL","XXXL"];
const EMPLOYMENT_STATUSES = ["Full Time","Part Time","Seasonal","Terminated"];

export default function EmployeeProfileTab({ employee, canEdit }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: employee.name || "",
    preferred_name: employee.preferred_name || "",
    date_of_birth: employee.date_of_birth || "",
    phone: employee.phone || "",
    personal_email: employee.personal_email || "",
    emergency_contact_name: employee.emergency_contact_name || "",
    emergency_contact_phone: employee.emergency_contact_phone || "",
    emergency_contact_relationship: employee.emergency_contact_relationship || "",
    home_address: employee.home_address || "",
    start_date: employee.start_date || "",
    employment_status: employee.employment_status || "Full Time",
    tshirt_size: employee.tshirt_size || "",
    profile_photo_url: employee.profile_photo_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, form);
    qc.invalidateQueries({ queryKey: ["employee", employee.id] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("profile_photo_url", file_url);
    setUploading(false);
  };

  const initials = form.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);

  return (
    <div className="space-y-6">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={form.profile_photo_url} />
          <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        {canEdit && (
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span><Upload className="w-3.5 h-3.5 mr-1.5" />{uploading ? "Uploading..." : "Upload Photo"}</span>
            </Button>
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </label>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Full Name</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Preferred Name / Nickname</Label>
          <Input value={form.preferred_name} onChange={e => set("preferred_name", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Date of Birth</Label>
          <Input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Personal Phone</Label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Personal Email</Label>
          <Input type="email" value={form.personal_email} onChange={e => set("personal_email", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Home Address</Label>
          <Input value={form.home_address} onChange={e => set("home_address", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Emergency Contact Name</Label>
          <Input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Emergency Contact Phone</Label>
          <Input value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Emergency Contact Relationship</Label>
          <Input value={form.emergency_contact_relationship} onChange={e => set("emergency_contact_relationship", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Start Date</Label>
          <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Employment Status</Label>
          <Select value={form.employment_status} onValueChange={v => set("employment_status", v)} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">T-Shirt Size</Label>
          <Select value={form.tshirt_size} onValueChange={v => set("tshirt_size", v)} disabled={!canEdit}>
            <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
            <SelectContent>{TSHIRT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {canEdit && (
        <Button onClick={handleSave} disabled={saving} className="mt-2">
          <Save className="w-4 h-4 mr-1.5" />{saving ? "Saving..." : "Save Profile"}
        </Button>
      )}
    </div>
  );
}