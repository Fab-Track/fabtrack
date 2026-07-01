import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import MaterialCombobox from "./MaterialCombobox";
import AddMaterialDialog from "./AddMaterialDialog";

const COMPONENT_LABELS = ["Top Rail", "Bottom Rail", "Post", "Picket", "Cap", "Other"];

export default function StyleComponentEditor({ open, onOpenChange, styleName, orgId }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [addMatOpen, setAddMatOpen] = useState(false);
  const [addMatRowIdx, setAddMatRowIdx] = useState(null);

  const { data: materials = [] } = useQuery({
    queryKey: ["materialPriceList", orgId],
    queryFn: () => orgId ? base44.entities.MaterialPriceList.filter({ organization_id: orgId }) : [],
    enabled: !!orgId && open,
  });

  const { data: existing } = useQuery({
    queryKey: ["styleComponentMap", orgId, styleName],
    queryFn: () => orgId && styleName
      ? base44.entities.StyleComponentMap.filter({ organization_id: orgId, style_name: styleName }).then(r => r[0] || null)
      : null,
    enabled: !!orgId && !!styleName && open,
  });

  useEffect(() => {
    if (existing) {
      setRows(existing.components || []);
    } else {
      setRows([]);
    }
  }, [existing]);

  function addRow() {
    setRows(prev => [...prev, { component_label: "Top Rail", material_id: "", material_name: "" }]);
  }

  function updateRow(idx, field, value) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === "material") {
        return { ...r, material_id: value.id, material_name: value.name };
      }
      return { ...r, [field]: value };
    }));
  }

  function removeRow(idx) {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }

  function moveRow(idx, dir) {
    setRows(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        style_name: styleName,
        components: rows.filter(r => r.material_id),
      };
      if (existing) {
        await base44.entities.StyleComponentMap.update(existing.id, payload);
      } else {
        await base44.entities.StyleComponentMap.create(payload);
      }
      qc.invalidateQueries({ queryKey: ["styleComponentMap"] });
      onOpenChange(false);
      toast.success("Components saved");
    } catch {
      toast.error("Failed to save components");
    }
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">Components — {styleName}</SheetTitle>
          <p className="text-xs text-muted-foreground">Define which materials make up this railing style.</p>
        </SheetHeader>

        <div className="space-y-3 pb-8">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No components yet. Add one below.</p>
          )}
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-start gap-1.5 border rounded-lg p-2.5">
              <div className="flex flex-col pt-7">
                <button
                  onClick={() => moveRow(idx, -1)}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveRow(idx, 1)}
                  disabled={idx === rows.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-[10px]">Component Label</Label>
                  <Input
                    list="component-labels"
                    className="h-8 text-xs"
                    value={row.component_label}
                    onChange={e => updateRow(idx, "component_label", e.target.value)}
                    placeholder="e.g. Top Rail"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Material</Label>
                  <MaterialCombobox
                    materials={materials}
                    value={row.material_id}
                    onChange={(m) => updateRow(idx, "material", m)}
                    onAddNew={() => { setAddMatRowIdx(idx); setAddMatOpen(true); }}
                  />
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 mt-6 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeRow(idx)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          <datalist id="component-labels">
            {COMPONENT_LABELS.map(c => <option key={c} value={c} />)}
          </datalist>

          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addRow}>
            <Plus className="w-4 h-4" /> Add Component
          </Button>

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-background py-3 border-t">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Components"}
            </Button>
          </div>
        </div>

        <AddMaterialDialog
          open={addMatOpen}
          onOpenChange={setAddMatOpen}
          orgId={orgId}
          onCreated={(mat) => {
            qc.invalidateQueries({ queryKey: ["materialPriceList"] });
            if (addMatRowIdx !== null) {
              updateRow(addMatRowIdx, "material", mat);
              setAddMatRowIdx(null);
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}