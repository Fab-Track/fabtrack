import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import EmployeeSMSNumberSection from "./EmployeeSMSNumberSection";
import EmployeeEmailSection from "./EmployeeEmailSection";
import { Separator } from "@/components/ui/separator";

const ROLES = ["welder","fitter","cutter","installer","foreman","admin","grinder","estimator","design_specialist","accountant","owner"];
const WORK_CENTERS = ["Cut","Fit","Weld","Grind","Install","Design","Powder Coat"];

export default function EmployeeWorkInfoTab({ employee, canEdit, canSeeRate }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    role: employee.role || "",
    work_center_primary: employee.work_center_primary || "",
    work_center_secondary: employee.work_center_secondary || "",
    hourly_rate: employee.hourly_rate ?? "",
    years_experience: employee.years_experience ?? "",
    certifications: employee.certifications || "",
    has_drivers_license: employee.has_drivers_license ?? false,
    can_operate_forklift: employee.can_operate_forklift ?? false,
    can_operate_boom_lift: employee.can_operate_boom_lift ?? false,
    internal_notes: employee.internal_notes || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form };
    if (!canSeeRate) delete payload.hourly_rate;
    if (payload.hourly_rate === "" || payload.hourly_rate === null) delete payload.hourly_rate;
    else payload.hourly_rate = parseFloat(payload.hourly_rate);
    if (payload.years_experience === "" || payload.years_experience === null) delete payload.years_experience;
    else payload.years_experience = parseFloat(payload.years_experience);
    await base44.entities.Employee.update(employee.id, payload);
    qc.invalidateQueries({ queryKey: ["employee", employee.id] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Role</Label>
          <Select value={form.role} onValueChange={v => set("role", v)} disabled={!canEdit}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Primary Work Center</Label>
          <Select value={form.work_center_primary} onValueChange={v => set("work_center_primary", v)} disabled={!canEdit}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{WORK_CENTERS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Secondary Work Center</Label>
          <Select value={form.work_center_secondary} onValueChange={v => set("work_center_secondary", v)} disabled={!canEdit}>
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {WORK_CENTERS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {canSeeRate && (
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Hourly Rate ($) — Internal Only</Label>
            <Input type="number" step="0.01" value={form.hourly_rate} onChange={e => set("hourly_rate", e.target.value)} disabled={!canEdit} />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Years of Experience in Trade</Label>
          <Input type="number" step="0.5" value={form.years_experience} onChange={e => set("years_experience", e.target.value)} disabled={!canEdit} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Certifications Held</Label>
        <Textarea rows={3} placeholder="e.g. OSHA 10, AWS Certified Welder..." value={form.certifications} onChange={e => set("certifications", e.target.value)} disabled={!canEdit} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
          <Label className="text-sm">Driver's License</Label>
          <Switch checked={form.has_drivers_license} onCheckedChange={v => set("has_drivers_license", v)} disabled={!canEdit} />
        </div>
        <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
          <Label className="text-sm">Forklift Certified</Label>
          <Switch checked={form.can_operate_forklift} onCheckedChange={v => set("can_operate_forklift", v)} disabled={!canEdit} />
        </div>
        <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
          <Label className="text-sm">Boom Lift Certified</Label>
          <Switch checked={form.can_operate_boom_lift} onCheckedChange={v => set("can_operate_boom_lift", v)} disabled={!canEdit} />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Internal Notes (Owner/Manager Only)</Label>
        <Textarea rows={4} value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} disabled={!canEdit} />
      </div>

      {canEdit && (
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" />{saving ? "Saving..." : "Save Work Info"}
        </Button>
      )}

      <Separator />

      {/* SMS Number Assignment — only for roles with SMS capability */}
      <EmployeeSMSNumberSection employee={employee} canEdit={canEdit} />

      <Separator />

      {/* Email Assignment — only for roles with email capability */}
      <EmployeeEmailSection employee={employee} canEdit={canEdit} />
    </div>
  );
}