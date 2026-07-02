/**
 * LineItemComponentsEditor — editable component/material rows for a single line item.
 * Used inside AddLineItemWizard when a railing-style item is selected.
 * Edits here apply only to this line item — they never change the style's saved
 * mapping in Settings (StyleComponentMap).
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
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

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Components</Label>
      {components.length === 0 && (
        <p className="text-xs text-muted-foreground">No components yet — add one below.</p>
      )}
      <div className="space-y-1.5">
        {components.map((row, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <Input
              list="li-component-labels"
              className="h-8 text-xs w-28 shrink-0"
              value={row.component_type}
              onChange={e => updateRow(idx, "component_type", e.target.value)}
            />
            <div className="flex-1 min-w-0">
              <MaterialCombobox
                materials={materials}
                value={materialIdForName(row.name)}
                onChange={(m) => updateRow(idx, "name", m.name)}
                onAddNew={() => { setAddMatRowIdx(idx); setAddMatOpen(true); }}
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

      <datalist id="li-component-labels">
        {COMPONENT_LABELS.map(c => <option key={c} value={c} />)}
      </datalist>

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
            updateRow(addMatRowIdx, "name", mat.name);
            setAddMatRowIdx(null);
          }
        }}
      />
    </div>
  );
}