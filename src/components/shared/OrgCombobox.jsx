import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Building2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Searchable dropdown for selecting an Organization.
 * Props:
 *   organizations — array of { id, name }
 *   value         — selected organization id (or null/undefined)
 *   onChange      — (org | null) => void  — receives the full org object or null when cleared
 *   placeholder   — string
 */
export default function OrgCombobox({ organizations = [], value, onChange, placeholder = "Select organization…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = organizations.find(o => o.id === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = organizations.filter(o =>
    !query || o.name?.toLowerCase().includes(query.toLowerCase())
  );

  function handleSelect(org) {
    onChange(org);
    setOpen(false);
    setQuery("");
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        <span className={selected ? "text-foreground truncate" : "text-muted-foreground"}>
          {selected ? selected.name : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && (
            <X
              className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
            />
          )}
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              className="h-8 text-sm"
              placeholder="Search organizations…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map(o => (
              <button
                key={o.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                onClick={() => handleSelect(o)}
              >
                <Check className={`w-3.5 h-3.5 shrink-0 ${o.id === value ? "opacity-100" : "opacity-0"}`} />
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium leading-tight truncate">{o.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">No organizations found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}