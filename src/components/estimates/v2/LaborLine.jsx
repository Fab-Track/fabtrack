import React from "react";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/costGroups";

// One labor line: hours × rate = cost, its own margin, and its own priced amount.
export default function LaborLine({ label, hours, rate, cost, margin, placeholder, priced, frozen, onHours, onMargin, extra }) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-border/60 pt-2">
      <span className="w-36 shrink-0 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          step="any"
          min="0"
          disabled={frozen}
          className="h-8 w-20 bg-background text-right font-mono text-sm"
          value={hours ?? ""}
          onChange={(e) => onHours(e.target.value)}
        />
        <span className="text-[11px] text-muted-foreground">hrs</span>
      </div>
      {extra}
      <div className="flex items-center gap-1 whitespace-nowrap pb-1.5 text-[11px] text-muted-foreground">
        <span>×</span>
        <span className="font-mono">{money(rate, 2)}/hr</span>
        <span>=</span>
        <b className="font-mono text-sm font-semibold text-foreground">{money(cost || 0)}</b>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Margin</span>
        <Input
          type="number"
          step="any"
          disabled={frozen}
          className="h-8 w-16 bg-background text-right font-mono text-sm"
          placeholder={placeholder}
          value={margin ?? ""}
          onChange={(e) => onMargin(e.target.value)}
        />
        <span className="text-[11px] text-muted-foreground">%</span>
      </div>
      <div className="ml-auto flex items-center gap-1 whitespace-nowrap pb-1.5 text-[11px] text-muted-foreground">
        <span>priced</span>
        <b className="font-mono text-sm font-semibold text-foreground">{money(priced || 0)}</b>
      </div>
    </div>
  );
}