import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { WOOD_TOPPERS, GLASS_OPTIONS, STEEL_TYPES, LOCATION_FEES } from "@/lib/railingData";

const fmt = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RailingCalcOption2({ calc, setCalc, lnft, location, styleAdder, customPricePerFoot, setCustomPricePerFoot, basePrice, styleName }) {
  const effectiveAdder = styleName === "Custom" ? (customPricePerFoot || 0) : (styleAdder || 0);
  const baseTotal = basePrice * lnft;
  const styleTotal = effectiveAdder * lnft;
  const woodAdder = WOOD_TOPPERS[calc.woodTopper] || 0;
  const steelAdder = STEEL_TYPES[calc.steelType] || 0;
  const glassAdder = GLASS_OPTIONS[calc.glass] || 0;
  const optionsTotal = (woodAdder + steelAdder + glassAdder) * lnft;
  const locationFee = LOCATION_FEES[location] || 0;
  const demoFee = parseFloat(calc.demoFee) || 0;
  const total = baseTotal + styleTotal + optionsTotal + locationFee + demoFee;

  return (
    <div className="flex gap-6 h-full">
      {/* Left — inputs */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {styleName === "Custom" && (
          <div className="space-y-1">
            <Label className="text-xs">Custom Price Per Foot ($)</Label>
            <Input
              type="number"
              className="h-8 text-xs"
              placeholder="0.00"
              value={customPricePerFoot}
              onChange={e => setCustomPricePerFoot(parseFloat(e.target.value) || 0)}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Wood Topper</Label>
          <Select value={calc.woodTopper} onValueChange={v => setCalc(p => ({ ...p, woodTopper: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(WOOD_TOPPERS).map(k => (
                <SelectItem key={k} value={k} className="text-xs">
                  {k}{WOOD_TOPPERS[k] > 0 ? ` (+$${WOOD_TOPPERS[k]}/lnft)` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Steel Type</Label>
          <Select value={calc.steelType} onValueChange={v => setCalc(p => ({ ...p, steelType: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(STEEL_TYPES).map(k => (
                <SelectItem key={k} value={k} className="text-xs">
                  {k}{STEEL_TYPES[k] > 0 ? ` (+$${STEEL_TYPES[k]}/lnft)` : " (standard)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Glass</Label>
          <Select value={calc.glass} onValueChange={v => setCalc(p => ({ ...p, glass: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(GLASS_OPTIONS).map(k => (
                <SelectItem key={k} value={k} className="text-xs">
                  {k}{GLASS_OPTIONS[k] > 0 ? ` (+$${GLASS_OPTIONS[k]}/lnft)` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Demo / Disposal Fee ($)</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            placeholder="0.00"
            value={calc.demoFee}
            onChange={e => setCalc(p => ({ ...p, demoFee: e.target.value }))}
          />
        </div>
      </div>

      {/* Right — live summary */}
      <div className="w-64 shrink-0 bg-muted/40 rounded-lg p-4 space-y-1.5 text-xs font-mono">
        <p className="text-xs font-semibold text-foreground mb-2 font-sans">LIVE SUMMARY</p>
        <CalcRow label="Base Price" value={baseTotal} detail={`($${basePrice}/lnft × ${lnft} lnft)`} />
        {styleName !== "Custom" && (
          <CalcRow label="Style Adder" value={styleTotal} detail={`(+$${effectiveAdder}/lnft × ${lnft} lnft)`} />
        )}
        {styleName === "Custom" && (
          <CalcRow label="Custom Price" value={styleTotal} detail={`(+$${effectiveAdder}/lnft × ${lnft} lnft)`} />
        )}
        <CalcRow label="Options" value={optionsTotal} />
        <CalcRow label="Location Fee" value={locationFee} />
        <CalcRow label="Demo/Disposal" value={demoFee} />
        <Separator className="my-2" />
        <div className="flex justify-between font-bold text-sm font-sans pt-1">
          <span>TOTAL BID</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

function CalcRow({ label, value, detail }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-muted-foreground">
        {label}
        {detail && <span className="text-[10px] text-muted-foreground/70 block">{detail}</span>}
      </span>
      <span className="text-foreground shrink-0">{`$${(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
    </div>
  );
}