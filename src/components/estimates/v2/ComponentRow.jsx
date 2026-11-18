import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MarginInput from "@/components/estimates/v2/MarginInput";
import { money } from "@/lib/costGroups";

// One grid shared by every component row and by the fuel row: cost, then margin, then price.
export const COMPONENT_COLS = "minmax(0,1.2fr) minmax(0,1.9fr) minmax(0,0.95fr) minmax(0,0.8fr) minmax(0,0.95fr) 28px";
export const COMPONENT_HEADERS = ["Component", "Catalog basis", "Hard cost", "Margin", "Price", ""];

// One component of a cost-group line: label, its inputs/basis, cost, margin, priced amount.
export default function ComponentRow({ label, note, detail, cost, margin, placeholder, price, frozen, onMargin, onReset, resetHint }) {
  return (
    <div className="grid items-center gap-2 px-4 py-1.5" style={{ gridTemplateColumns: COMPONENT_COLS }}>
      <div className="min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
      </div>
      <div className="min-w-0">{detail}</div>
      <div className="text-right">{cost}</div>
      <div className="flex justify-end">
        <MarginInput disabled={frozen} placeholder={placeholder} value={margin} onChange={onMargin} />
      </div>
      <span className="text-right font-mono text-sm">{money(price || 0)}</span>
      <div className="flex justify-end">
        {onReset && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled={frozen} className="h-6 w-6 text-amber-600 hover:text-amber-700" onClick={onReset}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{resetHint}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

// The cost cell: an editable amount on materials and powder coat.
export function CostInput({ value, frozen, onChange }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-xs text-muted-foreground">$</span>
      <Input
        type="number"
        min="0"
        step="any"
        disabled={frozen}
        className="h-7 w-20 bg-background text-right font-mono text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}