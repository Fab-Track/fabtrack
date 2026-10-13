import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaterialCombobox from "./MaterialCombobox";
import { RAILING_SLOTS } from "@/lib/railingTakeoff";

const money = (n, d = 2) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;

function usesSlot(m, slot) {
  const raw = Array.isArray(m.component_type) ? m.component_type : (m.component_type ? [m.component_type] : []);
  return raw.some(u => (u || "").trim().toLowerCase() === slot.toLowerCase());
}

function countedText(row, layout, mat) {
  if (!layout) return "—";
  const s = layout.steps;
  const unit = mat?.cost_method === "unit";
  if (row.slot === "Post") return unit ? `${s.posts} posts` : `${s.posts} posts × ${s.postHeight}"`;
  if (row.slot === "Picket") return unit ? `${s.totalPickets} pickets` : `${s.totalPickets} pickets × ${s.picketLength}"`;
  if (unit) return "1 per rail";
  return row.slot === "Bottom Rail" ? "Run length × (rail runs − 1)" : "Run length";
}

export default function ComponentRow({ row, idx, isRailing, materials, layout, length, result, onChange, onMaterial, onRemove, onAddNew }) {
  const isOther = row.slot === "Other";
  const mat = materials.find(m => m.id === row.material_id);
  const pickable = isOther ? materials : materials.filter(m => usesSlot(m, row.slot));
  const slots = isRailing ? [...RAILING_SLOTS, "Other"] : ["Other"];
  const num = (field) => (e) => onChange(idx, field, e.target.value === "" ? undefined : parseFloat(e.target.value));

  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2 w-32">
        <Select value={row.slot} onValueChange={v => onChange(idx, "slot", v)}>
          <SelectTrigger className="h-8 text-xs font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent>{slots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        {isOther && (
          <Input className="h-8 text-xs mt-1" placeholder="Label (e.g. Base plate)" value={row.label || ""} onChange={e => onChange(idx, "label", e.target.value)} />
        )}
      </td>
      <td className="px-3 py-2 min-w-[180px]">
        <MaterialCombobox
          materials={pickable}
          value={row.material_id}
          onChange={m => onMaterial(idx, m)}
          onAddNew={() => onAddNew(idx)}
          componentLabel={isOther ? undefined : row.slot}
        />
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground min-w-[150px]">
        {isOther ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1"><Input type="number" step="any" className="h-7 w-16 text-xs" value={row.qty_per_unit ?? ""} onChange={num("qty_per_unit")} /> per unit</div>
            <div className="flex items-center gap-1">+ <Input type="number" step="any" className="h-7 w-16 text-xs" value={row.fixed_qty ?? ""} onChange={num("fixed_qty")} /> fixed</div>
            <div className="flex items-center gap-1"><Input type="number" step="any" className="h-7 w-16 text-xs" value={row.waste_pct != null ? +(row.waste_pct * 100).toFixed(4) : ""} onChange={e => onChange(idx, "waste_pct", e.target.value === "" ? undefined : parseFloat(e.target.value) / 100)} /> % waste</div>
          </div>
        ) : countedText(row, layout, mat)}
      </td>
      <td className="px-3 py-2 text-right text-sm font-mono">
        {result ? `${result.qty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${result.qty_unit === "ft" ? "" : ` ${result.qty_unit}`}` : "—"}
      </td>
      <td className="px-3 py-2 text-right text-sm font-mono text-muted-foreground">
        {result ? money(result.unit_cost, 4) : "—"}
      </td>
      <td className="px-3 py-2 text-right text-sm font-mono font-bold">{result ? money(result.cost) : "—"}</td>
      <td className="px-1 py-2">
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onRemove(idx)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </td>
    </tr>
  );
}