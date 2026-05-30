import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Calculator } from "lucide-react";

const LOCATION_FEES = {
  "Utah County": 0,
  "Salt Lake County": 200,
  "Wasatch County": 300,
};

// type: "mono" | "double_steel" | "double_concrete" | "spiral"
export default function StaircaseInlineCalc({ staircaseType, onPriceChange, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [treads, setTreads] = useState("");
  const [elevation, setElevation] = useState(""); // spiral only
  const [location, setLocation] = useState("Utah County");
  const [demo, setDemo] = useState(0);

  const isSpiral = staircaseType === "spiral";
  const locationFee = LOCATION_FEES[location] || 0;

  const treadsNum = parseFloat(treads) || 0;
  const elevationNum = parseFloat(elevation) || 0;
  const demoNum = parseFloat(demo) || 0;

  const basePrice = isSpiral
    ? elevationNum * 105
    : treadsNum * 550;

  const total = basePrice + locationFee + demoNum;

  const inputValue = isSpiral ? elevationNum : treadsNum;

  useEffect(() => {
    if (inputValue > 0) {
      onPriceChange?.(total, inputValue);
    }
  }, [total, inputValue]);

  const label = isSpiral
    ? (elevationNum > 0 ? `Staircase Calculator — ${elevationNum} in → $${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "Staircase Calculator")
    : (treadsNum > 0 ? `Staircase Calculator — ${treadsNum} treads → $${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "Staircase Calculator");

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg mt-1 mb-1">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-amber-800"
        onClick={() => setExpanded(p => !p)}
        type="button"
      >
        <span className="flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5" />
          {label}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          {isSpiral ? (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-amber-700">Total Elevation (inches)</Label>
              <Input
                type="number"
                className="h-7 text-xs bg-white"
                placeholder="0"
                value={elevation}
                onChange={e => setElevation(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-amber-700">Number of Treads / Steps</Label>
              <Input
                type="number"
                className="h-7 text-xs bg-white"
                placeholder="0"
                value={treads}
                onChange={e => setTreads(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-amber-700">Location Fee</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(LOCATION_FEES).map(k => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {k} {LOCATION_FEES[k] > 0 ? `(+$${LOCATION_FEES[k]})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-amber-700">Demo / Disposal ($)</Label>
            <Input
              type="number"
              className="h-7 text-xs bg-white"
              placeholder="0"
              value={demo}
              onChange={e => setDemo(e.target.value)}
            />
          </div>

          {inputValue > 0 && (
            <div className="col-span-full bg-white rounded border border-amber-200 px-3 py-2 font-mono text-xs text-amber-800 space-y-0.5">
              {isSpiral ? (
                <div>Elevation: {elevationNum} inches × $105 = ${(elevationNum * 105).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              ) : (
                <div>Treads: {treadsNum} steps × $550 = ${(treadsNum * 550).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              )}
              <div>Location Fee: ${locationFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              <div>Demo/Disposal: ${demoNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              <div className="border-t border-amber-200 pt-0.5 font-bold text-amber-900">
                TOTAL: ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}