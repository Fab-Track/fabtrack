/**
 * ComponentUseSelect — multi-select "component use" picker for MaterialPriceList.component_type.
 * Modeled on CategorySelect's add-new pattern, but allows multiple selected values
 * (shown as removable chips) and supports typing a brand-new use that persists on save.
 *
 * Option list = DEFAULT_COMPONENT_TYPES (shared constant) ∪ `options` (distinct values
 * already present on material records, so custom uses a user added earlier reappear).
 */
import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Plus, Check } from "lucide-react";
import { DEFAULT_COMPONENT_TYPES } from "@/lib/materialComponentTypes";

function normalize(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

export default function ComponentUseSelect({ value, onChange, options = [], className = "" }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUse, setNewUse] = useState("");

  const selected = normalize(value);
  const allOptions = [...new Set([...DEFAULT_COMPONENT_TYPES, ...options])];
  const unselected = allOptions.filter(o => !selected.includes(o));

  function toggle(opt) {
    if (selected.includes(opt)) onChange(selected.filter(v => v !== opt));
    else onChange([...selected, opt]);
  }

  function confirmNew() {
    const v = newUse.trim();
    setNewUse("");
    setAdding(false);
    if (!v) return;
    if (!selected.includes(v)) onChange([...selected, v]);
  }

  function removeChip(opt, e) {
    e?.stopPropagation();
    onChange(selected.filter(v => v !== opt));
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setAdding(false); setNewUse(""); } }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full min-h-[28px] flex items-center flex-wrap gap-1 px-2 py-1 rounded-md border border-input bg-transparent text-left text-xs hover:bg-accent/40 ${className}`}
        >
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Select uses…</span>
          ) : (
            selected.map(u => (
              <Badge key={u} variant="secondary" className="text-[10px] gap-0.5 pr-1">
                {u}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={(e) => removeChip(u, e)}
                />
              </Badge>
            ))
          )}
          <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        {adding ? (
          <div className="p-2 flex items-center gap-1">
            <Input
              autoFocus
              className="h-8 text-xs"
              placeholder="New use name"
              value={newUse}
              onChange={e => setNewUse(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); confirmNew(); }
                if (e.key === "Escape") { setAdding(false); setNewUse(""); }
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={!newUse.trim()} onClick={confirmNew} type="button">
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" type="button" onClick={() => { setAdding(false); setNewUse(""); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto p-1">
            {allOptions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No options</p>
            )}
            {selected.map(u => (
              <button
                key={`sel-${u}`}
                type="button"
                onClick={() => toggle(u)}
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-muted text-xs flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3" /> {u}</span>
                <X className="w-3 h-3 opacity-60" />
              </button>
            ))}
            {unselected.map(u => (
              <button
                key={`opt-${u}`}
                type="button"
                onClick={() => toggle(u)}
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-muted text-xs"
              >
                {u}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-muted text-xs font-medium text-primary flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add new use
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}