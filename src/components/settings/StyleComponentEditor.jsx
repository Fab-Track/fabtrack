import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AddMaterialDialog from "./AddMaterialDialog";
import ComponentRow from "./ComponentRow";
import { computeLayout, costComponent, componentWarnings, resolveSettings } from "@/lib/railingTakeoff";

const money = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StyleComponentEditor({ open, onOpenChange, serviceCatalogId, orgId, displayName }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [length, setLength] = useState("10");
  const [isResidential, setIsResidential] = useState(true);
  const [addMatOpen, setAddMatOpen] = useState(false);
  const [addMatRowIdx, setAddMatRowIdx] = useState(null);
  const enabled = !!orgId && !!serviceCatalogId && open;

  const { data: item } = useQuery({
    queryKey: ["serviceCatalogItem", serviceCatalogId],
    queryFn: () => base44.entities.ServiceCatalog.get(serviceCatalogId),
    enabled,
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["materialPriceList", orgId],
    queryFn: () => base44.entities.MaterialPriceList.filter({ organization_id: orgId }),
    enabled,
  });
  const { data: settingsRecords = [] } = useQuery({
    queryKey: ["appSettings", orgId],
    queryFn: () => base44.entities.AppSettings.filter({ organization_id: orgId }),
    enabled,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["catalogCategories", orgId],
    queryFn: () => base44.entities.CatalogCategory.filter({ organization_id: orgId }, { limit: 500 }),
    enabled,
  });

  useEffect(() => { setRows(item?.components || []); }, [item]);

  const isRailing = !!item?.is_railing;
  const len = parseFloat(length) || 0;
  const category = categories.find(c => c.id === item?.category_id);
  const layout = useMemo(
    () => isRailing ? computeLayout({ catalogItem: item, settings: resolveSettings(settingsRecords), length: len, isResidential, category }) : null,
    [item, isRailing, settingsRecords, len, isResidential, category]
  );
  const results = rows.map(r => costComponent(r, materials.find(m => m.id === r.material_id), layout, len));
  const total = results.reduce((s, r) => s + (r?.cost || 0), 0);
  const warnings = isRailing ? componentWarnings(rows, layout) : [];

  const changeRow = (idx, field, value) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  const setMaterial = (idx, m) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, material_id: m.id, material_name: m.name } : r));
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));
  const addRow = () => setRows(prev => [...prev, { slot: "Other", label: "", material_id: "", material_name: "", qty_per_unit: 0, fixed_qty: 0, waste_pct: 0 }]);

  async function handleSave() {
    setSaving(true);
    try {
      await base44.entities.ServiceCatalog.update(serviceCatalogId, { components: rows.filter(r => r.material_id) });
      qc.invalidateQueries({ queryKey: ["serviceCatalogItem"] });
      qc.invalidateQueries({ queryKey: ["serviceCatalog"] });
      onOpenChange(false);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">Components — {displayName}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {isRailing ? "Railing slots follow the railing takeoff. Add “Other” lines for plates, anchors, caps." : "Add “Other” lines for the materials in this item."}
          </p>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">Test {isRailing ? "length (LF)" : "quantity"}</span>
          <Input type="number" className="h-8 w-24" value={length} onChange={e => setLength(e.target.value)} />
          {isRailing && (
            <div className="flex border rounded-md overflow-hidden">
              {[true, false].map(v => (
                <button key={String(v)} type="button" onClick={() => setIsResidential(v)} className={`px-3 py-1.5 font-semibold ${isResidential === v ? "bg-foreground text-background" : ""}`}>
                  {v ? "Residential" : "Commercial"}
                </button>
              ))}
            </div>
          )}
        </div>

        {warnings.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
            {warnings.map(w => <p key={w} className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{w}</p>)}
          </div>
        )}

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Slot</th>
                <th className="px-3 py-2">Cost item</th>
                <th className="px-3 py-2">How it's counted</th>
                <th className="px-3 py-2 text-right">Feet / Qty</th>
                <th className="px-3 py-2 text-right">Cost / ft or /unit</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">No components yet.</td></tr>
              )}
              {rows.map((row, idx) => (
                <ComponentRow
                  key={idx}
                  row={row}
                  idx={idx}
                  isRailing={isRailing}
                  materials={materials}
                  layout={layout}
                  length={len}
                  result={results[idx]}
                  onChange={changeRow}
                  onMaterial={setMaterial}
                  onRemove={removeRow}
                  onAddNew={(i) => { setAddMatRowIdx(i); setAddMatOpen(true); }}
                />
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold">Materials</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-sm">{money(total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={addRow}>
          <Plus className="w-4 h-4" /> Add component (plates, anchors, caps…)
        </Button>

        <div className="flex gap-2 pt-4 mt-4 sticky bottom-0 bg-background py-3 border-t">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Components"}</Button>
        </div>

        <AddMaterialDialog
          open={addMatOpen}
          onOpenChange={setAddMatOpen}
          orgId={orgId}
          onCreated={(mat) => {
            qc.invalidateQueries({ queryKey: ["materialPriceList"] });
            if (addMatRowIdx !== null) { setMaterial(addMatRowIdx, mat); setAddMatRowIdx(null); }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}