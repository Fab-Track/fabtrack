import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money } from "@/lib/costGroups";

// The cost-group line itself: what it is, where, how much, how it is priced as a whole.
export default function LineHeader({ line, frozen, colors, locations, blended, onChange, onRemove }) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-3 pb-1">
      <div className="min-w-[200px] flex-1 space-y-1">
        <Input className="h-8 text-sm font-semibold" placeholder="Cost group name" disabled={frozen} value={line.service_name || ""} onChange={(e) => onChange({ service_name: e.target.value })} />
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{line._is_railing ? "Railing" : "Cost group"}</span>
          {line._is_railing && (
            <select disabled={frozen} className="rounded border bg-transparent px-1 py-0.5" value={line.building_type || "Residential"} onChange={(e) => onChange({ building_type: e.target.value })}>
              <option>Residential</option>
              <option>Commercial</option>
            </select>
          )}
        </div>
      </div>

      <Select value={line.install_location || "N/A"} onValueChange={(v) => onChange({ install_location: v })}>
        <SelectTrigger className="h-8 w-[150px] text-xs" disabled={frozen}><SelectValue placeholder="Install location" /></SelectTrigger>
        <SelectContent>{locations.map((l) => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}</SelectContent>
      </Select>

      <Select value={line.color || "none"} onValueChange={(v) => onChange({ color: v === "none" ? "" : v })}>
        <SelectTrigger className="h-8 w-[110px] text-xs" disabled={frozen}><SelectValue placeholder="Color" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs">—</SelectItem>
          {colors.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input type="number" min="0" step="any" disabled={frozen} className="h-8 w-20 text-right font-mono text-sm" value={line.quantity ?? ""} onChange={(e) => onChange({ quantity: e.target.value })} />
        <span className="w-8 text-xs text-muted-foreground">{line.unit}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="secondary" className="whitespace-nowrap font-mono text-xs" title="Blended margin across the four costs">
          {blended}% blended
        </Badge>
        <span className="whitespace-nowrap font-mono text-base font-bold">{money(line.total || 0)}</span>
        <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground">
          <Checkbox disabled={frozen} checked={line.show_on_customer_estimate !== false} onCheckedChange={(v) => onChange({ show_on_customer_estimate: v === true })} />
          Show on customer estimate
        </label>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}