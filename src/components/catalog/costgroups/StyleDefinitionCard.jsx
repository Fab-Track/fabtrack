import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaterialCombobox from "@/components/settings/MaterialCombobox";
import { INFILL_TYPES, PICKET_ORIENTATIONS, needsInfillItem } from "@/lib/costGroups";

const Lbl = ({ children }) => <p className="text-xs text-muted-foreground mb-1">{children}</p>;

// Number field that saves on blur (same pattern as the layout overrides).
function DimField({ field, label, item, draft, setDraft, onSave }) {
  const val = draft[field] != null ? draft[field] : (item[field] ?? "");
  return (
    <div>
      <Lbl>{label}</Lbl>
      <Input
        type="number"
        step="any"
        className="h-9 text-sm font-mono"
        value={val}
        onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
        onBlur={() => {
          if (draft[field] == null) return;
          const n = parseFloat(draft[field]);
          const next = draft[field] === "" || isNaN(n) ? null : n;
          setDraft((d) => ({ ...d, [field]: undefined }));
          if (next !== (item[field] ?? null)) onSave(field, next);
        }}
      />
    </div>
  );
}

export default function StyleDefinitionCard({ item, materials, onSave }) {
  const [draft, setDraft] = useState({});

  return (
    <div className="bg-card border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-lg font-bold">Style definition</h3>
        <p className="text-xs text-muted-foreground mt-1">How this style is built. Each field saves as you change it.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Lbl>Picket orientation</Lbl>
          <Select value={item.picket_orientation || ""} onValueChange={(v) => onSave("picket_orientation", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>{PICKET_ORIENTATIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Lbl>Infill type</Lbl>
          <Select value={item.infill_type || ""} onValueChange={(v) => onSave("infill_type", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>{INFILL_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DimField field="top_rail_height_in" label="Top rail height (in)" item={item} draft={draft} setDraft={setDraft} onSave={onSave} />
        <DimField field="bottom_rail_height_in" label="Bottom rail height (in)" item={item} draft={draft} setDraft={setDraft} onSave={onSave} />
      </div>
      {needsInfillItem(item) && (
        <div className="grid sm:grid-cols-2 gap-3 items-start border-t pt-4">
          <div>
            <Lbl>{item.infill_type} cost item</Lbl>
            <MaterialCombobox materials={materials || []} value={item.infill_material_id} onChange={(m) => onSave("infill_material_id", m.id)} />
          </div>
          <p className="text-[11px] text-muted-foreground sm:pt-6">Costed per square foot of infill area (clear height × clear width per section).</p>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Picket width and height calculate from the picket cost item's size (1/2" × 1/2" gives 0.5" by 0.5");
        horizontal pickets stack by height, vertical pickets space by width. Any value typed under Layout overrides it.
      </p>
    </div>
  );
}