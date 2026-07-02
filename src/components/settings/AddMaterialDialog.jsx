import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CategorySelect from "./CategorySelect";

const CATEGORIES = ["Square Tube", "Rectangle Tube", "Flat Bar", "HR Channel", "Angle", "Round Bar", "Stair", "Other"];
const COMPONENT_TYPES = ["Top Rail", "Bottom Rail", "Post", "Picket", "Cap", "Other"];

export default function AddMaterialDialog({ open, onOpenChange, orgId, onCreated }) {
  const [form, setForm] = useState({ name: "", category: "Other", component_type: "Other", cost_per_foot: "" });
  const [saving, setSaving] = useState(false);

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
      const created = await base44.entities.MaterialPriceList.create({
        name: form.name.trim(),
        category: form.category,
        component_type: form.component_type,
        cost_per_foot: parseFloat(form.cost_per_foot) || 0,
        organization_id: orgId,
      });
      onCreated?.(created);
      setForm({ name: "", category: "Other", component_type: "Other", cost_per_foot: "" });
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
              <Select value={form.component_type} onValueChange={v => set("component_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Cost / linear ft <span className="text-muted-foreground">(reference only — not used for pricing)</span></Label>
            <Input
              type="number"
              step="0.0001"
              value={form.cost_per_foot}
              onChange={e => set("cost_per_foot", e.target.value)}
              placeholder="0.00"
            />
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