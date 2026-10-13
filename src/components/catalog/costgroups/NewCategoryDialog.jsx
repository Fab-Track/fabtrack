import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function NewCategoryDialog({ open, onOpenChange, orgId, count, onCreated }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [railing, setRailing] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Enter a category name");
    setSaving(true);
    const rec = await base44.entities.CatalogCategory.create({
      organization_id: orgId,
      name: name.trim(),
      pricing_unit: unit.trim() || (fixed ? "fixed price" : ""),
      is_railing: railing,
      is_fixed_price: fixed,
      sort_order: count,
    });
    setSaving(false);
    setName(""); setUnit(""); setRailing(false); setFixed(false);
    onOpenChange(false);
    onCreated(rec);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Pricing unit</Label><Input placeholder="per LF, per EA, lump sum…" value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
          <label className="flex items-center justify-between text-sm">Railing category (uses the railing takeoff)<Switch checked={railing} onCheckedChange={setRailing} /></label>
          <label className="flex items-center justify-between text-sm">Fixed-price add-ons<Switch checked={fixed} onCheckedChange={setFixed} /></label>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create category"}</Button>
      </DialogContent>
    </Dialog>
  );
}