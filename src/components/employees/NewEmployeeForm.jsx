import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { PhoneInput } from "@/components/ui/PhoneInput";

const ROLES = [
  "welder", "fitter", "cutter", "fabricator", "foreman",
  "admin", "grinder", "estimator", "design_specialist", "accountant", "owner"
];

const WORK_CENTERS = ["Cut", "Fit", "Weld", "Grind", "Install", "Design", "Powder Coat"];

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const EMPLOYMENT_STATUSES = ["Full Time", "Part Time", "Seasonal"];

export default function NewEmployeeForm({ onCreated, onCancel }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    preferred_name: "",
    role: "fabricator",
    work_center_primary: "",
    work_center_secondary: "",
    email: "",
    personal_email: "",
    phone: "",
    home_address: "",
    start_date: new Date().toISOString().slice(0, 10),
    employment_status: "Full Time",
    tshirt_size: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const created = await base44.entities.Employee.create({
      ...form,
      organization_id: user?.organization_id,
      is_active: true,
      onboarding_completed: false,
    });
    qc.invalidateQueries({ queryKey: ["employees"] });
    onCreated(created.id);
  };

  return (
    <div className="p-4 md:p-6 max-w-[800px] mx-auto">
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" />Back to Employees
      </Link>

      <h1 className="text-xl font-bold mb-5">Add New Employee</h1>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. John Smith" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Preferred Name</Label>
              <Input value={form.preferred_name} onChange={e => set("preferred_name", e.target.value)} placeholder="Nickname" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Role</Label>
              <Select value={form.role} onValueChange={v => set("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Primary Work Center</Label>
              <Select value={form.work_center_primary} onValueChange={v => set("work_center_primary", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {WORK_CENTERS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Secondary Work Center</Label>
              <Select value={form.work_center_secondary} onValueChange={v => set("work_center_secondary", v)}>
                <SelectTrigger><SelectValue placeholder="Select (optional)" /></SelectTrigger>
                <SelectContent>
                  {WORK_CENTERS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Work email" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Personal Email</Label>
              <Input type="email" value={form.personal_email} onChange={e => set("personal_email", e.target.value)} placeholder="Personal email" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phone</Label>
              <PhoneInput value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="000-000-0000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Home Address</Label>
              <Input value={form.home_address} onChange={e => set("home_address", e.target.value)} placeholder="Address" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Employment Status</Label>
              <Select value={form.employment_status} onValueChange={v => set("employment_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">T-Shirt Size</Label>
              <Select value={form.tshirt_size} onValueChange={v => set("tshirt_size", v)}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {TSHIRT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">Emergency Contact</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Name</Label>
                <Input value={form.emergency_contact_name} onChange={e => set("emergency_contact_name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone</Label>
                <PhoneInput value={form.emergency_contact_phone} onChange={e => set("emergency_contact_phone", e.target.value)} placeholder="000-000-0000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Relationship</Label>
                <Input value={form.emergency_contact_relationship} onChange={e => set("emergency_contact_relationship", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              <Save className="w-4 h-4 mr-1.5" />{saving ? "Creating..." : "Create Employee"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}