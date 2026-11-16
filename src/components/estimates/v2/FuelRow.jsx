import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { money } from "@/lib/costGroups";
import { num } from "@/lib/estimateCalc";
import { COMPONENT_COLS } from "@/components/estimates/v2/ComponentRow";
import MarginInput from "@/components/estimates/v2/MarginInput";

const r1 = (n) => (Math.round(n * 10) / 10).toString();

// Fuel & travel: cost from distance, a margin like every other row, and its customer-display choice.
export default function FuelRow({ fuel, miles, setMiles, extra, setExtra, fuelMarginPct, setFuelMarginPct, separate, setSeparate, placeholder, price, mpg, targetMargin, frozen }) {
  const hasInputs = num(miles) > 0;
  const missingSettings = hasInputs && !(num(mpg) > 0 && num(price) > 0);
  return (
    <div className="grid items-center gap-2 border-t-2 bg-muted/20 px-4 py-2.5" style={{ gridTemplateColumns: COMPONENT_COLS }}>
      <div className="min-w-0">
        <p className="text-xs font-semibold">Fuel &amp; travel</p>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground">
          <Checkbox disabled={frozen} checked={!!separate} onCheckedChange={(v) => setSeparate(v === true)} className="h-3.5 w-3.5" />
          Show as a separate line to the customer
        </label>
      </div>

      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-1">
          <Input type="number" min="0" disabled={frozen} className="h-7 w-16 bg-background text-right font-mono text-sm" value={miles} onChange={(e) => setMiles(e.target.value)} />
          <span className="whitespace-nowrap text-[11px] text-muted-foreground">mi one way</span>
          <Input type="number" min="0" disabled={frozen} className="h-7 w-12 bg-background text-center font-mono text-sm" value={extra} onChange={(e) => setExtra(e.target.value)} />
          <span className="whitespace-nowrap text-[11px] text-muted-foreground">extra trips</span>
        </div>
        {hasInputs ? (
          <p className="text-[10px] text-muted-foreground">
            {fuel.days} install day(s) + {num(extra)} = <b>{fuel.trips} round trips</b>
            {" · "}<span className="font-mono">{num(miles)} mi × 2 × {fuel.trips} ÷ {num(mpg) || "?"} mpg = {r1(fuel.gallons)} gal</span>
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">Calculated from distance · target margin {num(targetMargin)}%</p>
        )}
        {missingSettings && <p className="text-[10px] text-amber-700">Set truck MPG and fuel price in Settings.</p>}
      </div>

      <span className="text-right font-mono text-sm">{hasInputs ? money(fuel.cost) : "—"}</span>
      <div className="flex justify-end">
        <MarginInput disabled={frozen} placeholder={String(placeholder)} value={fuelMarginPct} onChange={setFuelMarginPct} />
      </div>
      <span className="text-right font-mono text-sm font-bold">{money(fuel.price)}</span>
      <span />
    </div>
  );
}