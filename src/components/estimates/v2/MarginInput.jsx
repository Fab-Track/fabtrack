import React from "react";
import { Input } from "@/components/ui/input";

// The one margin field used everywhere on an estimate, so every row reads the same.
export default function MarginInput({ value, placeholder, disabled, onChange }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="number"
        step="any"
        disabled={disabled}
        className="h-8 w-16 bg-background text-right font-mono text-sm"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-xs text-muted-foreground">%</span>
    </span>
  );
}