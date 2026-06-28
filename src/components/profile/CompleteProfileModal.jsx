import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/AuthContext";
import { useWriteOrgId } from "@/lib/orgContext";

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function CompleteProfileModal({ open, onOpenChange, employee, onSaved }) {
  const { user } = useAuth();
  const writeOrgId = useWriteOrgId();
  const [form, setForm] = useState({
    home_address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    years_experience: "",
    certifications: "",
    tshirt_size: "",
    can_operate_forklift: false,
    can_operate_boom_lift: false,
    has_drivers_license: false,
    fun_fact_self: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Initialize form from employee data when modal opens
  useEffect(() => {
    if (open) {
      setForm({
        home_address: employee?.home_address || "",
        emergency_contact_name: employee?.emergency_contact_name || "",
        emergency_contact_phone: employee?.emergency_contact_phone || "",
        years_experience: employee?.years_experience ?? "",
        certifications: employee?.certifications || "",
        tshirt_size: employee?.tshirt_size || "",
        can_operate_forklift: employee?.can_operate_forklift || false,
        can_operate_boom_lift: employee?.can_operate_boom_lift || false,
        has_drivers_license: employee?.has_drivers_license || false,
        fun_fact_self: employee?.fun_fact_self || "",
      });
      setError("");
    }
  }, [open, employee]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (complete) => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        home_address: form.home_address,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        years_experience:
          form.years_experience === "" ? null : Number(form.years_experience),
        certifications: form.certifications,
        tshirt_size: form.tshirt_size,
        can_operate_forklift: form.can_operate_forklift,
        can_operate_boom_lift: form.can_operate_boom_lift,
        has_drivers_license: form.has_drivers_license,
        fun_fact_self: form.fun_fact_self,
        profile_complete: complete,
      };

      if (employee?.id) {
        await base44.entities.Employee.update(employee.id, payload);
      } else {
        await base44.entities.Employee.create({
          ...payload,
          name: user?.full_name || user?.email,
          email: user?.email,
          user_id: user?.id,
          organization_id: writeOrgId,
        });
      }

      onSaved?.();
    } catch (err) {
      setError(err?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Help your team get to know you and provide essential info for
            scheduling and safety.
          </DialogDescription>
        </DialogHeader>

        {/* Personal Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b pb-1">
            Personal Info
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Home Address</Label>
              <Input
                value={form.home_address}
                onChange={(e) => set("home_address", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Emergency Contact Name</Label>
              <Input
                value={form.emergency_contact_name}
                onChange={(e) => set("emergency_contact_name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Emergency Contact Phone</Label>
              <Input
                value={form.emergency_contact_phone}
                onChange={(e) => set("emergency_contact_phone", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Work Background */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b pb-1">
            Work Background
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Years of Experience</Label>
              <Input
                type="number"
                min="0"
                value={form.years_experience}
                onChange={(e) => set("years_experience", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Certifications</Label>
              <Input
                value={form.certifications}
                onChange={(e) => set("certifications", e.target.value)}
                placeholder="e.g. OSHA 10, AWS"
              />
            </div>
          </div>
        </div>

        {/* Logistics & Equipment */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b pb-1">
            Logistics &amp; Equipment
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">T-Shirt Size</Label>
              <Select
                value={form.tshirt_size}
                onValueChange={(v) => set("tshirt_size", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {TSHIRT_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Forklift Certified</Label>
              <Switch
                checked={form.can_operate_forklift}
                onCheckedChange={(v) => set("can_operate_forklift", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Boom Lift Certified</Label>
              <Switch
                checked={form.can_operate_boom_lift}
                onCheckedChange={(v) => set("can_operate_boom_lift", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Driver's License</Label>
              <Switch
                checked={form.has_drivers_license}
                onCheckedChange={(v) => set("has_drivers_license", v)}
              />
            </div>
          </div>
        </div>

        {/* Team Building */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b pb-1">
            Team Building
          </h3>
          <div className="space-y-1">
            <Label className="text-xs">Fun Fact About Yourself</Label>
            <Textarea
              rows={3}
              value={form.fun_fact_self}
              onChange={(e) => set("fun_fact_self", e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save for Later"}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving ? "Saving..." : "Save & Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}