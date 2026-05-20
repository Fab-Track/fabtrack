import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Calculator } from "lucide-react";
import {
  getBasePricePerFoot,
  STYLE_ADDERS,
  LOCATION_FEES,
  WOOD_TOPPERS,
  GLASS_OPTIONS,
  STEEL_TYPES,
  RAILING_STYLES,
} from "@/lib/railingData";

export default function RailingInlineCalc({ styleName, onPriceChange, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [lnft, setLnft] = useState("");
  const [location, setLocation] = useState("Utah County");
  const [woodTopper, setWoodTopper] = useState("None");
  const [glass, setGlass] = useState("None");
  const [steelType, setSteelType] = useState("Mild Steel");
  const [customStyleAdder, setCustomStyleAdder] = useState(0);

  const style = styleName || "Custom";
  const lnftNum = parseFloat(lnft) || 0;

  const basePPF = lnftNum > 0 ? getBasePricePerFoot(lnftNum) : 0;
  const styleAdder = style === "Custom" ? customStyleAdder : (STYLE_ADDERS[style] || 0);
  const locationFee = LOCATION_FEES[location] || 0;
  const woodAdder = WOOD_TOPPERS[woodTopper] || 0;
  const glassAdder = GLASS_OPTIONS[glass] || 0;
  const steelAdder = STEEL_TYPES[steelType] || 0;

  const pricePerFoot = basePPF + styleAdder + woodAdder + glassAdder + steelAdder;
  const total = lnftNum * pricePerFoot + locationFee;

  useEffect(() => {
    if (lnftNum > 0) {
      onPriceChange?.(total, lnftNum);
    }
  }, [total, lnftNum]);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg mt-1 mb-1">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-blue-800"
        onClick={() => setExpanded(p => !p)}
        type="button"
      >
        <span className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5" />
          Railing Calculator {lnftNum > 0 ? `— ${lnftNum} lnft → $${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : ""}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-blue-700">Linear Feet</Label>
            <Input
              type="number"
              className="h-7 text-xs bg-white"
              placeholder="0"
              value={lnft}
              onChange={e => setLnft(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-blue-700">Location Fee</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(LOCATION_FEES).map(k => (
                  <SelectItem key={k} value={k} className="text-xs">{k} {LOCATION_FEES[k] > 0 ? `(+$${LOCATION_FEES[k]})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-blue-700">Steel Type</Label>
            <Select value={steelType} onValueChange={setSteelType}>
              <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(STEEL_TYPES).map(k => (
                  <SelectItem key={k} value={k} className="text-xs">{k} {STEEL_TYPES[k] > 0 ? `(+$${STEEL_TYPES[k]}/ft)` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-blue-700">Wood Topper</Label>
            <Select value={woodTopper} onValueChange={setWoodTopper}>
              <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(WOOD_TOPPERS).map(k => (
                  <SelectItem key={k} value={k} className="text-xs">{k} {WOOD_TOPPERS[k] > 0 ? `(+$${WOOD_TOPPERS[k]}/ft)` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-blue-700">Glass</Label>
            <Select value={glass} onValueChange={setGlass}>
              <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(GLASS_OPTIONS).map(k => (
                  <SelectItem key={k} value={k} className="text-xs">{k} {GLASS_OPTIONS[k] > 0 ? `(+$${GLASS_OPTIONS[k]}/ft)` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {style === "Custom" && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-blue-700">Style Adder ($/ft)</Label>
              <Input
                type="number"
                className="h-7 text-xs bg-white"
                value={customStyleAdder}
                onChange={e => setCustomStyleAdder(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          {lnftNum > 0 && (
            <div className="col-span-full bg-white rounded border border-blue-200 px-3 py-2 flex items-center justify-between">
              <div className="text-xs text-blue-700 space-y-0.5">
                <div>Base: ${basePPF}/ft × {lnftNum} ft = ${(basePPF * lnftNum).toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                {styleAdder > 0 && <div>Style adder: +${styleAdder}/ft</div>}
                {woodAdder > 0 && <div>Wood topper: +${woodAdder}/ft</div>}
                {glassAdder > 0 && <div>Glass: +${glassAdder}/ft</div>}
                {steelAdder > 0 && <div>Steel: +${steelAdder}/ft</div>}
                {locationFee > 0 && <div>Location fee: +${locationFee}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-blue-600">Total</div>
                <div className="text-base font-bold text-blue-800">${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}