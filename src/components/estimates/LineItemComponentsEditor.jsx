/**
 * LineItemComponentsEditor — editable component/material rows for a single line item.
 * Used inside AddLineItemWizard when a railing-style item is selected.
 * Edits here apply only to this line item — they never change the style's saved
 * mapping in Settings (StyleComponentMap).
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaterialCombobox from "@/components/settings/MaterialCombobox";
import AddMaterialDialog from "@/components/settings/AddMaterialDialog";

const COMPONENT_LABELS = ["Top Rail", "Bottom Rail", "Post", "Picket", "Cap", "Other"];

export default function LineItemComponentsEditor({ components = [], onChange, materials = [], orgId, onMaterialCreated }) {
  const [addMatOpen, setAddMatOpen] = useState(false);
  const [addMatRowIdx, setAddMatRowIdx] = useState(null);

  function addRow() {
    onChange([...(components || []), { component_type: "Top Rail", name: "" }]);
  }

  function updateRow(idx, field, value) {
    const next = components.map((r, i) => (i === idx ? { ...r, [field]: value } : r));
    onChange(next);
  }

  function removeRow(idx) {
    onChange(components.filter((_, i) => i !== idx));
  }

  function materialIdForName(name) {
    return materials.find(m => m.name === name)?.id || "";
  }

  // Store both the material id and name when a material is picked from the combobox,
  // so the line carries a stable link to the MaterialPriceList record.
  function setMaterialForRow(idx, m) {
    const next = components.map((r, i) => (i === idx ? { ...r, name: m.name, material_id: m.id } : r));
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Components</Label>
      {components.length === 0 && (
        <p className="text-xs text-muted-foreground">No components yet — add one below.</p>
      )}
      <div className="space-y-1.5">
        {components.map((row, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <Select
              value={row.component_type}
              onValueChange={v => updateRow(idx, "component_type", v)}
            >
              <SelectTrigger className="h-8 text-xs w-28 shrink-0">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {COMPONENT_LABELS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 min-w-0">
              <MaterialCombobox
                materials={materials}
                value={row.material_id || materialIdForName(row.name)}
                onChange={(m) => setMaterialForRow(idx, m)}
                onAddNew={() => { setAddMatRowIdx(idx); setAddMatOpen(true); }}
                componentLabel={row.component_type}
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => removeRow(idx)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={addRow}>
        <Plus className="w-3.5 h-3.5" /> Add Component
      </Button>

      <AddMaterialDialog
        open={addMatOpen}
        onOpenChange={setAddMatOpen}
        orgId={orgId}
        onCreated={(mat) => {
          onMaterialCreated?.(mat);
          if (addMatRowIdx !== null) {
            const next = components.map((r, i) => (i === addMatRowIdx ? { ...r, name: mat.name, material_id: mat.id } : r));
            onChange(next);
            setAddMatRowIdx(null);
          }
        }}
      />
    </div>
  );
}