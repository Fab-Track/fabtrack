import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { money } from "@/lib/costGroups";
import { num } from "@/lib/estimateCalc";

const r1 = (n) => (Math.round(n * 10) / 10).toString();

export default function FuelRow({ fuel, miles, setMiles, extra, setExtra, fuelMargin, setFuelMargin, price, mpg, frozen, cols }) {
  const hasInputs = num(miles) > 0;
  return (
    <>
      <div className="grid gap-2 items-center px-4 py-3 border-t" style={{ gridTemplateColumns: cols }}>
        <div><p className="font-semibold text-sm">Fuel &amp; travel</p><p className="text-xs text-muted-foreground">Job add-on · calculated from distance</p></div>
        <span className="text-muted-foreground">—</span><span className="text-muted-foreground">—</span>
        <span className="text-right font-mono text-sm">{hasInputs ? `${fuel.trips} trips` : "—"}</span>
        <span className="text-right font-mono text-sm">{hasInputs ? money(fuel.cost) : "—"}</span>
        <span className="text-right font-mono text-sm text-muted-foreground">{fuelMargin ? "margin" : "at cost"}</span>
        <span className="text-right font-mono text-sm font-bold">{money(fuel.price)}</span>
        <span className="w-7" />
      </div>
      <div className="bg-muted/30 border-t px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs font-bold mb-1">Miles to job (one way)</p>
          <Input type="number" min="0" disabled={frozen} className="w-36 h-10 text-right border-2 border-primary" value={miles} onChange={(e) => setMiles(e.target.value)} />
        </div>
        <div>
          <p className="text-xs font-bold mb-1">Extra trips</p>
          <Input type="number" min="0" disabled={frozen} className="w-24 h-10 text-right" value={extra} onChange={(e) => setExtra(e.target.value)} />
        </div>
        {hasInputs && (
          <div className="text-xs space-y-0.5 pb-1">
            <p>{fuel.days} install day(s) + {num(extra)} extra = <b>{fuel.trips} round trips</b></p>
            <p className="font-mono">{num(miles)} mi × 2 × {fuel.trips} trips ÷ {num(mpg) || "?"} mpg = {r1(fuel.gallons)} gal × {money(num(price))}</p>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm font-semibold pb-2 cursor-pointer">
          <Checkbox disabled={frozen} checked={fuelMargin} onCheckedChange={(v) => setFuelMargin(!!v)} /> Add margin to fuel
        </label>
        {hasInputs && !(num(mpg) > 0 && num(price) > 0) && <p className="text-xs text-amber-700 pb-2">Set truck MPG and fuel price in Settings.</p>}
      </div>
    </>
  );
}