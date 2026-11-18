import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Search } from "lucide-react";

// Chooses the existing catalog item an incoming row updates, or "Add as new item".
export default function CostItemMatchPicker({ existing, value, onChange, usedIds }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = existing.find((m) => m.id === value);
  const q = search.trim().toLowerCase();
  const list = (q
    ? existing.filter((m) => `${m.name || ""} ${m.sku || ""}`.toLowerCase().includes(q))
    : existing).slice(0, 100);

  const pick = (id) => { onChange(id); setOpen(false); setSearch(""); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button" role="combobox" className="w-full justify-between font-normal h-9 text-sm">
          <span className={`truncate ${selected ? "font-mono text-xs font-semibold" : ""}`}>
            {selected ? selected.name : "Add as new item"}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <button
          type="button"
          onClick={() => pick(null)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left border-b hover:bg-muted ${!value ? "bg-muted" : ""}`}
        >
          <span className="font-semibold">Add as new item</span>
          {!value && <Check className="w-4 h-4" />}
        </button>
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input autoFocus placeholder="Search name or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-sm" />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No catalog items found</p>
          ) : list.map((m) => {
            const taken = usedIds.has(m.id) && m.id !== value;
            return (
              <button
                key={m.id}
                type="button"
                disabled={taken}
                onClick={() => pick(m.id)}
                className={`w-full flex items-start justify-between gap-2 px-3 py-2 text-left hover:bg-muted ${taken ? "opacity-40 cursor-not-allowed" : ""} ${value === m.id ? "bg-muted" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-semibold truncate">{m.name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {[m.sku && `SKU ${m.sku}`, m.category].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {taken && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">used</span>}
                  {value === m.id && <Check className="w-4 h-4" />}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}