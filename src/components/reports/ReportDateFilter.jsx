import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subYears, parseISO } from "date-fns";

const PRESETS = [
  { value: "this_week",    label: "This Week" },
  { value: "this_month",   label: "This Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year",    label: "This Year" },
  { value: "last_year",    label: "Last Year" },
  { value: "custom",       label: "Custom Range" },
];

function getRange(preset, customStart, customEnd) {
  const now = new Date();
  switch (preset) {
    case "this_week":    return { start: startOfWeek(now), end: endOfWeek(now) };
    case "this_month":   return { start: startOfMonth(now), end: endOfMonth(now) };
    case "this_quarter": return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "this_year":    return { start: startOfYear(now), end: endOfYear(now) };
    case "last_year":    return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };
    case "custom": {
      const s = customStart ? parseISO(customStart) : startOfMonth(now);
      const e = customEnd   ? parseISO(customEnd)   : endOfMonth(now);
      return { start: s, end: e };
    }
    default: return { start: startOfYear(now), end: endOfYear(now) };
  }
}

export default function ReportDateFilter({ onChange }) {
  const [preset, setPreset] = useState("this_year");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  function handlePreset(val) {
    setPreset(val);
    const range = getRange(val, customStart, customEnd);
    onChange?.(range);
  }

  function handleCustom(field, val) {
    const ns = field === "start" ? val : customStart;
    const ne = field === "end"   ? val : customEnd;
    if (field === "start") setCustomStart(val);
    if (field === "end")   setCustomEnd(val);
    if (ns && ne) onChange?.(getRange("custom", ns, ne));
  }

  // Emit initial range on mount
  React.useEffect(() => {
    onChange?.(getRange("this_year", "", ""));
  }, []);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Date Range</Label>
        <Select value={preset} onValueChange={handlePreset}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESETS.map(p => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {preset === "custom" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" className="h-8 text-xs w-36" value={customStart} onChange={e => handleCustom("start", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" className="h-8 text-xs w-36" value={customEnd} onChange={e => handleCustom("end", e.target.value)} />
          </div>
        </>
      )}
    </div>
  );
}

export { getRange };