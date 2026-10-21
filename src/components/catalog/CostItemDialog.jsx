import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChipMultiSelect from "./ChipMultiSelect";
import CostMethodBox from "./CostMethodBox";
import { COST_TYPES, USED_AS_OPTIONS, calcCostPerFoot } from "@/lib/costItems";
import { toast } from "sonner";

const s = (v) => (v == null ? "" : String(v));

function toForm(m) {
  return {
    name: m?.name || "",
    category: m?.category || "Other",
    cost_type: m?.cost_type || "Materials",
    component_type: m?.component_type || [],
    cost_code_ids: m?.cost_code_ids || [],
    cost_method: m?.cost_method || "linear_foot",
    stock_length_ft: s(m?.stock_length_ft || ""),
    cost_per_stick: s(m?.cost_per_stick || ""),
    cost_per_foot: s(m?.cost_per_foot || ""),
    weight_per_ft: s(m?.weight_per_ft || ""),
    price_per_lb_override: s(m?.price_per_lb_override || ""),
    unit: m?.unit || "",
    cost_per_unit: s(m?.cost_per_unit || ""),
    supplier: m?.supplier || "",
    unit_price: s(m?.unit_price ?? ""),
    sku: m?.sku || "",
    taxable: !!m?.taxable,
    needs_review: !!m?.needs_review,
  };
}

function Row({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{label}{hint && <span className="font-normal text-muted-foreground"> {hint}</span>}</Label>
      {children}
    </div>
  );
}

// Add / edit a cost item. `item` is null when adding.
export default function CostItemDialog({ open, onOpenChange, item, shapes, costCodes, orgId, onSaved }) {
  const [form, setForm] = useState(toForm(null));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setForm(toForm(item)); setError(""); }
  }, [open, item]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k) => parseFloat(form[k]) || 0;
  const shapeList = [...new Set([...shapes, form.category].filter(Boolean))];
  const usedAsOptions = [...new Set([...USED_AS_OPTIONS, ...form.component_type])].map((v) => ({ value: v, label: v }));
  const codeOptions = costCodes.map((c) => ({ value: c.id, label: c.name }));

  async function save() {
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.cost_type) return setError("Cost type is required.");
    if (form.cost_code_ids.length === 0) return setError("Pick at least one cost code.");
    setBusy(true);
    setError("");
    try {
    const method = form.cost_method;
    const data = {
      name: form.name.trim(),
      category: form.category,
      cost_type: form.cost_type,
      component_type: form.component_type.length ? form.component_type : ["Other"],
      cost_code_ids: form.cost_code_ids,
      cost_method: method,
      supplier: form.supplier.trim(),
      sku: form.sku.trim(),
      taxable: form.taxable,
      needs_review: form.needs_review,
    };
    if (form.unit_price !== "") data.unit_price = num("unit_price");
    if (method === "linear_foot") {
      data.stock_length_ft = num("stock_length_ft");
      data.cost_per_stick = num("cost_per_stick");
    }
    if (method === "weight") {
      data.weight_per_ft = num("weight_per_ft");
      data.price_per_lb_override = num("price_per_lb_override") || null;
    }
    if (method === "unit") {
      data.unit = form.unit.trim();
      data.cost_per_unit = num("cost_per_unit");
    } else {
      data.cost_per_foot = calcCostPerFoot({
        method, stock: num("stock_length_ft"), stick: num("cost_per_stick"),
        typedCostPerFoot: num("cost_per_foot"), weightPerFt: num("weight_per_ft"), pricePerLb: num("price_per_lb_override"),
      });
    }
    if (item) await base44.entities.MaterialPriceList.update(item.id, data);
    else await base44.entities.MaterialPriceList.create({ ...data, organization_id: orgId, active: true });
    setBusy(false);
    toast.success(item ? "Cost item updated" : "Cost item created");
    onSaved();
    onOpenChange(false);
    } catch (e) {
      setBusy(false);
      setError(e?.message || "Failed to save. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto border-t-4 border-t-primary">
        <DialogHeader><DialogTitle className="text-xl">{item ? "Edit Cost Item" : "New Cost Item"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Row label="Name *">
            <Input className="font-mono" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Shape">
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{shapeList.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="Cost type *">
              <Select value={form.cost_type} onValueChange={(v) => set("cost_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COST_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
          </div>
          <Row label="Used as" hint="— which railing slots can pick this item">
            <ChipMultiSelect options={usedAsOptions} value={form.component_type} onChange={(v) => set("component_type", v)} />
          </Row>
          <Row label="Cost codes *">
            <ChipMultiSelect options={codeOptions} value={form.cost_code_ids} onChange={(v) => set("cost_code_ids", v)} addLabel="+ Add code" chipClass="bg-primary/15 text-foreground" />
          </Row>

          <CostMethodBox form={form} set={set} />

          <div className="grid grid-cols-2 gap-3">
            <Row label="Supplier"><Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></Row>
            <Row label="Unit price" hint="(optional)">
              <Input type="number" step="any" className="font-mono" placeholder="—" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} />
            </Row>
            <Row label="SKU"><Input className="font-mono" placeholder="Supplier part #" value={form.sku} onChange={(e) => set("sku", e.target.value)} /></Row>
            <div className="flex flex-col justify-end gap-2 pb-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox checked={form.taxable} onCheckedChange={(v) => set("taxable", !!v)} /> Taxable
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox checked={form.needs_review} onCheckedChange={(v) => set("needs_review", !!v)} /> Needs review
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}