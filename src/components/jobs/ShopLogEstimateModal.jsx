import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";

const FIELDS = [
  { key: "est_shop_labor_hours", label: "Shop Labor (hrs)" },
  { key: "est_install_labor_hours", label: "Install Labor (hrs)" },
  { key: "est_draw_measure_hours", label: "Draw / Measure (hrs)" },
  { key: "est_materials_cost", label: "Materials ($)" },
  { key: "est_powder_coat_cost", label: "Powder Coat ($)" },
  { key: "est_fuel_cost", label: "Fuel ($)" }
];

export default function ShopLogEstimateModal({ open, onClose, job, onSave }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !job) return;
    const init = {};
    FIELDS.forEach(f => { init[f.key] = job[f.key] ?? 0; });
    setValues(init);
  }, [open, job]);

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val === "" ? 0 : Number(val) }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(values);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Estimated Costs</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={values[f.key] ?? 0}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}