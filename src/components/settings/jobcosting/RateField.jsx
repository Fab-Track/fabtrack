import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Number input with an optional prefix/suffix unit and a one-line helper underneath.
export default function RateField({ label, helper, prefix, suffix, value, onChange, step = "any", children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children || (
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">{prefix}</span>}
          <Input
            type="number"
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`h-10 font-mono text-sm ${prefix ? "pl-7" : ""} ${suffix ? "pr-14" : ""}`}
          />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">{suffix}</span>}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">{helper}</p>
    </div>
  );
}