import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CategorySelect from "./CategorySelect";
import ComponentUseSelect from "./ComponentUseSelect";

const CATEGORIES = ["Square Tube", "Rectangle Tube", "Flat Bar", "HR Channel", "Angle", "Round Bar", "Stair", "Other"];

export default function AddMaterialDialog({ open, onOpenChange, orgId, onCreated }) {
  const [form, setForm] = useState({ name: "", category: "Other", component_type: ["Other"], cost_per_foot: "", stock_length_ft: "", cost_per_stick: "", weight_per_ft: "" });
  const [saving, setSaving] = useState(false);

  const stickVal = parseFloat(form.cost_per_stick) || 0;
  const stockVal = parseFloat(form.stock_length_ft) || 0;
  const isAuto = stickVal > 0 && stockVal > 0;
  const autoCost = isAuto ? Math.round((stickVal / stockVal) * 10000) / 10000 : null;

  const { data: existingMaterials = [] } = useQuery({
    queryKey: ["materialPriceList", orgId],
    queryFn: () => orgId ? base44.entities.MaterialPriceList.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });
  const categories = [...new Set([...CATEGORIES, ...existingMaterials.map(m => m.category).filter(Boolean)])];

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const costPerFoot = isAuto
        ? autoCost
        : (parseFloat(form.cost_per_foot) || 0);
      const created = await base44.entities.MaterialPriceList.create({
        name: form.name.trim(),
        category: form.category,
        component_type: form.component_type,
        stock_length_ft: parseFloat(form.stock_length_ft) || 0,
        cost_per_stick: parseFloat(form.cost_per_stick) || 0,
        weight_per_ft: parseFloat(form.weight_per_ft) || 0,
        cost_per_foot: costPerFoot,
        organization_id: orgId,
      });
      onCreated?.(created);
      setForm({ name: "", category: "Other", component_type: ["Other"], cost_per_foot: "", stock_length_ft: "", cost_per_stick: "", weight_per_ft: "" });
      onOpenChange(false);
      toast.success("Material added");
    } catch {
      toast.error("Failed to add material");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder='e.g. SQUARE TUBE 1" × 1" × 0.065"'
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <CategorySelect categories={categories} value={form.category} onChange={v => set("category", v)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Component Type</Label>
              <ComponentUseSelect
                value={form.component_type}
                onChange={v => set("component_type", v)}
                options={[...new Set(existingMaterials.flatMap(m => Array.isArray(m.component_type) ? m.component_type : (m.component_type ? [m.component_type] : [])))]}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Stock length (ft)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.stock_length_ft}
                onChange={e => set("stock_length_ft", e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Cost / stick</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost_per_stick}
                onChange={e => set("cost_per_stick", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-xs">Weight / ft (lb)</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.weight_per_ft}
                onChange={e => set("weight_per_ft", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Cost / linear ft <span className="text-muted-foreground">(reference only — not used for pricing)</span></Label>
            {isAuto ? (
              <div
                className="flex items-center gap-1 h-9 px-3 text-sm bg-muted rounded-md border border-dashed"
                title={`Auto-derived: $${autoCost} = $${stickVal} / ${stockVal} ft`}
              >
                <span className="tabular-nums">${autoCost.toFixed(4)}</span>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">auto</span>
              </div>
            ) : (
              <Input
                type="number"
                step="0.0001"
                value={form.cost_per_foot}
                onChange={e => set("cost_per_foot", e.target.value)}
                placeholder="0.00"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? "Adding…" : "Add Material"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}