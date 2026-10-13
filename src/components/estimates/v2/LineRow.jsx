import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LineItemPhotoUpload from "@/components/estimates/LineItemPhotoUpload";
import { money } from "@/lib/costGroups";
import { lineKind, hasMargin } from "@/lib/estimateCalc";

const BD = [["Materials", "materials"], ["Fabrication", "fabrication"], ["Powder coat", "powder_coat"], ["Install", "install"]];

export default function LineRow({ line, idx, cols, estMargin, frozen, colors, locations, onChange, onRemove, onTakeoff }) {
  const kind = lineKind(line);
  const cost = kind === "cost";
  const fixed = kind === "fixed";
  const lock = cost && frozen;
  const set = (patch) => onChange(idx, patch);
  const sub = cost ? `${line._is_railing ? "Railing" : "Cost group"}` : fixed ? "Job add-on · fixed price" : "Manual line";
  return (
    <>
      <div className="grid gap-2 items-start px-4 py-3 border-t" style={{ gridTemplateColumns: cols }}>
        <div className="space-y-1 min-w-0">
          <Input className="h-8 text-sm font-semibold" placeholder="Service name" value={line.service_name || ""} onChange={(e) => set({ service_name: e.target.value })} />
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {sub}
            {cost && line._is_railing && (
              <select disabled={lock} className="bg-transparent border rounded px-1 py-0.5" value={line.building_type || "Residential"} onChange={(e) => set({ building_type: e.target.value })}>
                <option>Residential</option><option>Commercial</option>
              </select>
            )}
          </div>
          <Input className="h-8 text-xs" placeholder="Description" value={line.description || ""} onChange={(e) => set({ description: e.target.value })} />
          {line._warn && <p className="text-xs text-amber-700">{line._warn}</p>}
        </div>
        <Select value={line.install_location || "N/A"} onValueChange={(v) => set({ install_location: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{locations.map((l) => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={line.color || "none"} onValueChange={(v) => set({ color: v === "none" ? "" : v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Color" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">—</SelectItem>
            {colors.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 justify-end">
          <Input type="number" min="0" disabled={lock} className="h-8 w-20 text-right text-sm" value={line.quantity ?? ""} onChange={(e) => set({ quantity: e.target.value })} />
          <span className="text-xs text-muted-foreground w-6">{line.unit}</span>
        </div>
        <span className="text-right font-mono text-sm pt-1.5">{cost ? money(line.hard_cost || 0) : "—"}</span>
        <div className="text-right pt-0.5">
          {cost ? (
            <span className="inline-flex items-center gap-0.5">
              <Input type="number" disabled={lock} className="h-8 w-16 text-right text-xs" placeholder={String(estMargin)} value={hasMargin(line.margin_pct) ? line.margin_pct : ""} onChange={(e) => set({ margin_pct: e.target.value === "" ? null : parseFloat(e.target.value) })} />%
            </span>
          ) : <span className="font-mono text-sm text-muted-foreground inline-block pt-1">{fixed ? "fixed" : "—"}</span>}
        </div>
        <div className="text-right">
          {fixed ? (
            <Input type="number" min="0" className="h-8 text-right font-mono text-sm" placeholder="Price" value={line.unit_cost ?? ""} onChange={(e) => set({ unit_cost: e.target.value })} />
          ) : kind === "legacy" ? (
            <Input type="number" className="h-8 text-right font-mono text-sm" value={line.unit_cost ?? ""} onChange={(e) => set({ unit_cost: e.target.value })} />
          ) : null}
          <p className="font-mono font-bold text-sm pt-1">{money(line.total || 0)}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onRemove(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
      {cost && (
        <div className="bg-muted/30 border-t px-4 py-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {BD.map(([l, k]) => <span key={k}>{l} <b className="font-mono">{money(line.cost_breakdown?.[k] || 0)}</b></span>)}
          {line.components?.length > 0 && <button type="button" className="text-primary underline" onClick={() => onTakeoff(line)}>View takeoff</button>}
        </div>
      )}
      <div className="px-4 pb-2">
        <LineItemPhotoUpload photoUrl={line.photo_url} showPhoto={line.show_photo} onChange={(url) => set({ photo_url: url })} onToggleShow={() => set({ show_photo: line.show_photo === false })} />
      </div>
    </>
  );
}