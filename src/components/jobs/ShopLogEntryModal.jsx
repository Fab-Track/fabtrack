import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const SIMPLE_FIELDS = [
  { key: "draw_measure_hours", label: "Draw / Measure (hrs)" },
  { key: "materials_cost", label: "Materials ($)" },
  { key: "powder_coat_cost", label: "Powder Coat ($)" },
  { key: "fuel_cost", label: "Fuel ($)" }
];

const CREW_FIELDS = [
  { key: "shop_labor_hours", label: "Shop Labor", unit: "hrs" },
  { key: "install_labor_hours", label: "Install Labor", unit: "hrs" }
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
  const [crew, setCrew] = useState({
    shop_labor_people: "",
    shop_labor_hours_per_person: "",
    install_labor_people: "",
    install_labor_hours_per_person: ""
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
      // Try to reverse-derive crew inputs from the stored total
      setCrew({
        shop_labor_people: "",
        shop_labor_hours_per_person: "",
        install_labor_people: "",
        install_labor_hours_per_person: ""
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
      setCrew({
        shop_labor_people: "",
        shop_labor_hours_per_person: "",
        install_labor_people: "",
        install_labor_hours_per_person: ""
      });
    }
  }, [open, entry]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCrewChange = (field, value) => {
    setCrew(prev => ({ ...prev, [field]: value }));
  };

  // Auto-calculate totals from crew inputs
  const computedTotals = useMemo(() => {
    const shopPeople = Number(crew.shop_labor_people) || 0;
    const shopHrs = Number(crew.shop_labor_hours_per_person) || 0;
    const installPeople = Number(crew.install_labor_people) || 0;
    const installHrs = Number(crew.install_labor_hours_per_person) || 0;
    return {
      shop_labor_hours: shopPeople * shopHrs,
      install_labor_hours: installPeople * installHrs
    };
  }, [crew]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    // Use computed totals if crew inputs are present, otherwise fall back to manual entry
    CREW_FIELDS.forEach(f => {
      const people = Number(crew[`${f.key}_people`]) || 0;
      const hrs = Number(crew[`${f.key}_hours_per_person`]) || 0;
      if (people > 0 && hrs > 0) {
        payload[f.key] = people * hrs;
      } else {
        payload[f.key] = Number(payload[f.key]) || 0;
      }
    });
    SIMPLE_FIELDS.forEach(f => { payload[f.key] = Number(payload[f.key]) || 0; });
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

          {/* Crew-based labor inputs */}
          {CREW_FIELDS.map(f => {
            const peopleKey = `${f.key}_people`;
            const hrsKey = `${f.key}_hours_per_person`;
            const total = computedTotals[f.key];
            return (
              <div key={f.key} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">{f.label}</Label>
                  {total > 0 && (
                    <span className="text-xs font-bold">
                      Total: {total.toFixed(1)} {f.unit}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground"># of People</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={crew[peopleKey]}
                      onChange={(e) => handleCrewChange(peopleKey, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Hours / Person</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={crew[hrsKey]}
                      onChange={(e) => handleCrewChange(hrsKey, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-3">
            {SIMPLE_FIELDS.map(f => (
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