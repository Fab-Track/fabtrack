import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const FIELDS = [
  { key: "shop_labor_hours", label: "Shop Labor (hrs)" },
  { key: "install_labor_hours", label: "Install Labor (hrs)" },
  { key: "draw_measure_hours", label: "Draw / Measure (hrs)" },
  { key: "materials_cost", label: "Materials ($)" },
  { key: "powder_coat_cost", label: "Powder Coat ($)" },
  { key: "fuel_cost", label: "Fuel ($)" }
];

export default function ShopLogEntryModal({ open, onClose, onSubmit, entry, onUpdate }) {
  const isEditing = !!entry;
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    submitted_by_name: "",
    shop_labor_hours: "",
    install_labor_hours: "",
    draw_measure_hours: "",
    materials_cost: "",
    powder_coat_cost: "",
    fuel_cost: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setForm({
        entry_date: entry.entry_date || new Date().toISOString().slice(0, 10),
        submitted_by_name: entry.submitted_by_name || "",
        shop_labor_hours: String(entry.shop_labor_hours ?? ""),
        install_labor_hours: String(entry.install_labor_hours ?? ""),
        draw_measure_hours: String(entry.draw_measure_hours ?? ""),
        materials_cost: String(entry.materials_cost ?? ""),
        powder_coat_cost: String(entry.powder_coat_cost ?? ""),
        fuel_cost: String(entry.fuel_cost ?? "")
      });
    } else {
      setForm({
        entry_date: new Date().toISOString().slice(0, 10),
        submitted_by_name: "",
        shop_labor_hours: "",
        install_labor_hours: "",
        draw_measure_hours: "",
        materials_cost: "",
        powder_coat_cost: "",
        fuel_cost: ""
      });
    }
  }, [open, entry]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    FIELDS.forEach(f => { payload[f.key] = Number(payload[f.key]) || 0; });
    if (isEditing) {
      await onUpdate(entry.id, payload);
    } else {
      await onSubmit(payload);
    }
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Entry" : "Log Shop Entry"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={form.entry_date}
                onChange={(e) => handleChange("entry_date", e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-xs">Submitted By</Label>
              <Input
                value={form.submitted_by_name}
                onChange={(e) => handleChange("submitted_by_name", e.target.value)}
                placeholder="Name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEditing ? "Update Entry" : "Save Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}