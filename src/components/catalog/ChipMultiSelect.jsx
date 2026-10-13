import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";

// Multi-select shown as removable chips with a dashed "+ Add" button.
// options: [{ value, label }]; value: array of option values.
export default function ChipMultiSelect({ options, value, onChange, addLabel = "+ Add", chipClass = "bg-muted text-foreground" }) {
  const [open, setOpen] = useState(false);
  const labelOf = (v) => options.find((o) => o.value === v)?.label || v;
  const remaining = options.filter((o) => !value.includes(o.value));

  return (
    <div className="flex flex-wrap items-center gap-2 border rounded-lg p-2 min-h-[44px]">
      {value.map((v) => (
        <span key={v} className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-medium ${chipClass}`}>
          {labelOf(v)}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${labelOf(v)}`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="rounded-md border border-dashed px-2.5 py-1 text-sm text-muted-foreground hover:bg-muted/50">
            {addLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          {remaining.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">Nothing left to add.</p>
          ) : remaining.map((o) => (
            <button
              key={o.value}
              type="button"
              className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => { onChange([...value, o.value]); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}