import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import LineItemPhotoUpload from "@/components/estimates/LineItemPhotoUpload";
import { money } from "@/lib/costGroups";
import { lineKind } from "@/lib/estimateCalc";
import { COMPONENT_COLS } from "@/components/estimates/v2/ComponentRow";

// A fixed-price add-on or a manual line: same grid as the component rows, priced by hand.
export default function LineRow({ line, idx, frozen, onChange, onRemove }) {
  const fixed = lineKind(line) === "fixed";
  const set = (patch) => onChange(idx, patch);
  return (
    <>
      <div className="grid items-center gap-2 border-t px-4 py-2.5" style={{ gridTemplateColumns: COMPONENT_COLS }}>
        <div className="min-w-0">
          <Input className="h-8 text-sm font-semibold" placeholder="Service name" disabled={frozen} value={line.service_name || ""} onChange={(e) => set({ service_name: e.target.value })} />
          <p className="text-[10px] text-muted-foreground">{fixed ? "Job add-on · fixed price" : "Manual line"}</p>
        </div>
        <div className="flex items-center gap-1">
          <Input type="number" min="0" step="any" disabled={frozen} className="h-7 w-16 bg-background text-right font-mono text-sm" value={line.quantity ?? ""} onChange={(e) => set({ quantity: e.target.value })} />
          <span className="text-[11px] text-muted-foreground">{line.unit}</span>
        </div>
        <span className="text-right font-mono text-sm">—</span>
        <span className="text-right text-[11px] text-muted-foreground">{fixed ? "fixed" : "—"}</span>
        <div className="text-right">
          <Input type="number" min="0" step="any" disabled={frozen} className="h-7 w-full bg-background text-right font-mono text-sm" placeholder="Unit price" value={line.unit_cost ?? ""} onChange={(e) => set({ unit_cost: e.target.value })} />
          <p className="pt-1 font-mono text-sm font-bold">{money(line.total || 0)}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onRemove(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="px-4 pb-2">
        <LineItemPhotoUpload photoUrl={line.photo_url} showPhoto={line.show_photo} onChange={(url) => set({ photo_url: url })} onToggleShow={() => set({ show_photo: line.show_photo === false })} />
      </div>
    </>
  );
}