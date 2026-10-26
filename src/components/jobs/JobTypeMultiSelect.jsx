import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

const JOB_TYPES = ["Railing", "Stairs", "Planters", "Gate", "Fence", "Staircase", "Custom Structure", "Other"];

export { JOB_TYPES };

export default function JobTypeMultiSelect({ value = [], onChange, placeholder = "Select type(s)…" }) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];

  const toggle = (item) => {
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };

  const remove = (item) => onChange(selected.filter(s => s !== item));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="min-h-9 w-full flex flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm text-left hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-ring">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selected.map(s => (
              <span key={s} className="inline-flex items-center gap-0.5 rounded bg-accent/20 px-1.5 py-0.5 text-xs">
                {s}
                <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={(e) => { e.stopPropagation(); remove(s); }} />
              </span>
            ))
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="max-h-52 overflow-y-auto space-y-1">
          {JOB_TYPES.map(t => (
            <div key={t} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/30 cursor-pointer" onClick={() => toggle(t)}>
              <Checkbox checked={selected.includes(t)} onCheckedChange={() => toggle(t)} />
              <span className="text-sm">{t}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}