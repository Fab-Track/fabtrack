import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaterialCombobox from "@/components/settings/MaterialCombobox";
import { INFILL_TYPES, PICKET_ORIENTATIONS, needsInfillItem } from "@/lib/costGroups";
import { materialCrossSection, materialForSlot } from "@/lib/railingTakeoff";

const Lbl = ({ children }) => <p className="text-xs text-muted-foreground mb-1">{children}</p>;

// Rail profile height, read off the material assigned to that rail in Components.
const RailSize = ({ slot, item, materials }) => {
  const h = materialCrossSection(materialForSlot(item, materials, slot))?.height;
  return (
    <div>
      <Lbl>{slot} (in)</Lbl>
      <div className="h-9 flex items-center rounded-md border bg-muted/40 px-3 font-mono text-sm">
        {h ?? "—"}
      </div>
    </div>
  );
};

export default function StyleDefinitionCard({ item, materials, onSave }) {
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
        <RailSize slot="Top Rail" item={item} materials={materials} />
        <RailSize slot="Bottom Rail" item={item} materials={materials} />
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
        Rail and picket sizes come from the cost items assigned under Components (1/2" × 1/2" gives 0.5" by 0.5").
        Horizontal pickets stack up the clear height between the rails, vertical pickets space across the bay.
      </p>
    </div>
  );
}