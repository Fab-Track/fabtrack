import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Search, Plus } from "lucide-react";

export default function MaterialCombobox({ materials, value, onChange, onAddNew }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = materials.find(m => m.id === value);

  const filtered = materials.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          type="button"
          className="w-full justify-between font-normal h-9 text-sm"
        >
          <span className="truncate">
            {selected ? selected.name : "Select material…"}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search materials…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No materials found</p>
          ) : (
            filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between gap-2 ${value === m.id ? "bg-muted" : ""}`}
              >
                <span className="text-sm truncate">{m.name}</span>
                {m.component_type && m.component_type !== "Other" && (
                  <Badge variant="outline" className="text-[10px] shrink-0">{m.component_type}</Badge>
                )}
              </button>
            ))
          )}
        </div>
        {onAddNew && (
          <div className="border-t p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              type="button"
              onClick={() => { onAddNew(); setOpen(false); setSearch(""); }}
            >
              <Plus className="w-3.5 h-3.5" /> Add New Material
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}