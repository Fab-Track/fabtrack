import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { money } from "@/lib/costGroups";
import { num } from "@/lib/estimateCalc";

const r1 = (n) => (Math.round(n * 10) / 10).toString();

export default function FuelRow({ fuel, miles, setMiles, extra, setExtra, fuelMargin, setFuelMargin, price, mpg, estMargin, frozen, cols }) {
  const hasInputs = num(miles) > 0;
  const missingSettings = hasInputs && !(num(mpg) > 0 && num(price) > 0);
  return (
    <div className="grid gap-2 items-center px-4 py-3 border-t" style={{ gridTemplateColumns: cols }}>
      <div className="min-w-0">
        <p className="font-semibold text-sm">Fuel &amp; travel</p>
        {hasInputs ? (
          <p className="text-[11px] text-muted-foreground">
            {fuel.days} install day(s) + {num(extra)} extra = <b>{fuel.trips} round trips</b>
            {" · "}<span className="font-mono">{num(miles)} mi × 2 × {fuel.trips} ÷ {num(mpg) || "?"} mpg = {r1(fuel.gallons)} gal</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Job add-on · calculated from distance</p>
        )}
        {missingSettings && <p className="text-[11px] text-amber-700">Set truck MPG and fuel price in Settings.</p>}
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Miles one way</p>
        <Input type="number" min="0" disabled={frozen} className="h-8 text-right font-mono text-sm" value={miles} onChange={(e) => setMiles(e.target.value)} />
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extra trips</p>
        <Input type="number" min="0" disabled={frozen} className="h-8 text-right font-mono text-sm" value={extra} onChange={(e) => setExtra(e.target.value)} />
      </div>

      <span className="text-right font-mono text-sm">{hasInputs ? `${fuel.trips} trips` : "—"}</span>
      <span className="text-right font-mono text-sm">{hasInputs ? money(fuel.cost) : "—"}</span>
      <span className="text-right font-mono font-bold text-sm">{money(fuel.price)}</span>

      <div className="text-right">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
          <Checkbox disabled={frozen} checked={fuelMargin} onCheckedChange={(v) => setFuelMargin(!!v)} />
          {fuelMargin ? `${num(estMargin)}%` : "at cost"}
        </label>
      </div>

      <span className="w-7" />
    </div>
  );
}