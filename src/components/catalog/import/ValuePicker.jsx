import React, { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// A small searchable dropdown used to pick an existing FabTrack value.
export default function ValuePicker({ value, options, placeholder = "Select…", onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hits = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
    return hits.slice(0, 80);
  }, [q, options]);

  const current = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline" size="sm"
          className={cn("w-full justify-between font-normal bg-card", !current && "text-muted-foreground")}
        >
          <span className="truncate">{current?.label || placeholder}</span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input autoFocus className="h-8 pl-7" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {list.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No matches</p>}
          {list.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn("w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted", o.value === value && "bg-muted font-semibold")}
            >
              {o.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}