import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { WOOD_TOPPERS, GLASS_OPTIONS, STEEL_TYPES, LOCATION_FEES } from "@/lib/railingData";

const LABOR_RATE = 27;
const POWDER_COAT_RATE = 10.50;

const fmt = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RailingCalcOption1({ rows, setRows, lnft, location, calc, setCalc, styleName }) {
  // Material cost
  const materialCost = rows.reduce((sum, r) => {
    const qty = parseFloat(r.linearFeet) || 0;
    const cost = parseFloat(r.costPerFoot) || 0;
    return sum + qty * cost;
  }, 0);

  const powderCoat = (parseFloat(calc.powderCoatRate) || POWDER_COAT_RATE) * lnft;
  const fabLabor = (parseFloat(calc.fabLaborHrs) || 0) * lnft * LABOR_RATE;
  const installLabor = (parseFloat(calc.installLaborHrs) || 0) * lnft * LABOR_RATE;
  const totalHardCost = materialCost + powderCoat + fabLabor + installLabor;

  const multiplier = parseFloat(calc.multiplier) || 2.0;
  const intermediateBid = totalHardCost * multiplier;

  const woodAdder = (WOOD_TOPPERS[calc.woodTopper] || 0) * lnft;
  const steelAdder = (STEEL_TYPES[calc.steelType] || 0) * lnft;
  const glassAdder = (GLASS_OPTIONS[calc.glass] || 0) * lnft;
  const locationFee = LOCATION_FEES[location] || 0;
  const demoFee = parseFloat(calc.demoFee) || 0;

  const totalBid = intermediateBid + woodAdder + steelAdder + glassAdder + locationFee + demoFee;

  function updateRow(idx, field, value) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // Auto-calc linearFeet from lnft × qtyMultiplier unless manually overridden
      return next;
    });
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Left — inputs */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {/* Material rows */}
        <div>
          <p className="text-xs font-semibold mb-2">Material Components</p>
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[80px_1fr_80px_80px_70px] gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground font-medium truncate">{row.label}</span>
                <Input
                  className="h-7 text-xs"
                  placeholder="Material name"
                  value={row.material}
                  onChange={e => updateRow(idx, "material", e.target.value)}
                />
                <Input
                  className="h-7 text-xs"
                  type="number"
                  placeholder="$/ft"
                  value={row.costPerFoot}
                  onChange={e => updateRow(idx, "costPerFoot", e.target.value)}
                />
                <Input
                  className="h-7 text-xs"
                  type="number"
                  placeholder="Qty"
                  value={row.linearFeet}
                  onChange={e => updateRow(idx, "linearFeet", e.target.value)}
                />
                <span className="text-xs text-right text-muted-foreground">
                  {fmt((parseFloat(row.linearFeet) || 0) * (parseFloat(row.costPerFoot) || 0))}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-[80px_1fr_80px_80px_70px] gap-1.5 text-[10px] text-muted-foreground font-medium px-0 pt-1">
              <span></span><span>Material</span><span>$/ft</span><span>Lin Ft</span><span className="text-right">Amount</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Fixed costs */}
        <div className="space-y-2">
          <p className="text-xs font-semibold">Fixed Costs</p>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-36 shrink-0">Powder Coat ($/lnft)</Label>
            <Input type="number" className="h-7 text-xs w-24" value={calc.powderCoatRate} onChange={e => setCalc(p => ({ ...p, powderCoatRate: e.target.value }))} />
            <span className="text-xs text-muted-foreground">{fmt(powderCoat)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-36 shrink-0">Fab Labor (hrs/lnft)</Label>
            <Input type="number" className="h-7 text-xs w-24" value={calc.fabLaborHrs} onChange={e => setCalc(p => ({ ...p, fabLaborHrs: e.target.value }))} />
            <span className="text-xs text-muted-foreground">{fmt(fabLabor)} @ $27/hr</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-36 shrink-0">Install Labor (hrs/lnft)</Label>
            <Input type="number" className="h-7 text-xs w-24" value={calc.installLaborHrs} onChange={e => setCalc(p => ({ ...p, installLaborHrs: e.target.value }))} />
            <span className="text-xs text-muted-foreground">{fmt(installLabor)} @ $27/hr</span>
          </div>
        </div>

        <Separator />

        {/* Multiplier */}
        <div className="space-y-2">
          <p className="text-xs font-semibold">Multiplier</p>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-36 shrink-0">Multiplier (e.g. 2.0)</Label>
            <Input type="number" className="h-7 text-xs w-24" value={calc.multiplier} onChange={e => setCalc(p => ({ ...p, multiplier: e.target.value }))} step="0.1" />
            <span className="text-xs text-muted-foreground">× {multiplier.toFixed(1)} = {fmt(intermediateBid)}</span>
          </div>
        </div>

        <Separator />

        {/* Options */}
        <div className="space-y-2">
          <p className="text-xs font-semibold">Options (added after multiplier)</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs w-36 shrink-0">Wood Topper</Label>
              <Select value={calc.woodTopper} onValueChange={v => setCalc(p => ({ ...p, woodTopper: v }))}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(WOOD_TOPPERS).map(k => (
                    <SelectItem key={k} value={k} className="text-xs">{k}{WOOD_TOPPERS[k] > 0 ? ` (+$${WOOD_TOPPERS[k]}/lnft)` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-36 shrink-0">Steel Type</Label>
              <Select value={calc.steelType} onValueChange={v => setCalc(p => ({ ...p, steelType: v }))}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(STEEL_TYPES).map(k => (
                    <SelectItem key={k} value={k} className="text-xs">{k}{STEEL_TYPES[k] > 0 ? ` (+$${STEEL_TYPES[k]}/lnft)` : " (standard)"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-36 shrink-0">Glass</Label>
              <Select value={calc.glass} onValueChange={v => setCalc(p => ({ ...p, glass: v }))}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(GLASS_OPTIONS).map(k => (
                    <SelectItem key={k} value={k} className="text-xs">{k}{GLASS_OPTIONS[k] > 0 ? ` (+$${GLASS_OPTIONS[k]}/lnft)` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-36 shrink-0">Demo / Disposal ($)</Label>
              <Input type="number" className="h-7 text-xs flex-1" placeholder="0.00" value={calc.demoFee} onChange={e => setCalc(p => ({ ...p, demoFee: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* Right — live summary */}
      <div className="w-64 shrink-0 bg-muted/40 rounded-lg p-4 space-y-1.5 text-xs font-mono overflow-y-auto">
        <p className="text-xs font-semibold text-foreground mb-2 font-sans">HARD COSTS</p>
        <CalcRow label="Material Cost" value={materialCost} />
        <CalcRow label="Powder Coat" value={powderCoat} />
        <CalcRow label="Fab Labor" value={fabLabor} />
        <CalcRow label="Install Labor" value={installLabor} />
        <Separator className="my-1" />
        <CalcRow label="Total Hard Cost" value={totalHardCost} bold />

        <div className="pt-2">
          <span className="text-muted-foreground">× Multiplier ({(multiplier * 100).toFixed(0)}%): × {multiplier.toFixed(1)}</span>
        </div>
        <Separator className="my-1" />
        <CalcRow label="Intermediate Bid" value={intermediateBid} bold />

        <p className="text-xs font-semibold text-foreground mt-3 mb-1 font-sans">OPTIONS</p>
        <CalcRow label="Wood Topper" value={woodAdder} />
        <CalcRow label="Steel Upgrade" value={steelAdder} />
        <CalcRow label="Glass" value={glassAdder} />
        <CalcRow label="Location Fee" value={locationFee} />
        <CalcRow label="Demo/Disposal" value={demoFee} />
        <Separator className="my-2" />
        <div className="flex justify-between font-bold text-sm font-sans pt-1">
          <span>TOTAL BID</span>
          <span>{fmt(totalBid)}</span>
        </div>
      </div>
    </div>
  );
}

function CalcRow({ label, value, bold }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold text-foreground" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="shrink-0">{`$${(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
    </div>
  );
}