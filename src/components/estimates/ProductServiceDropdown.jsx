import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search } from "lucide-react";

export default function ProductServiceDropdown({ value, onChange, onSelect, placeholder = "Description" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const containerRef = useRef(null);

  const { data: library = [] } = useQuery({
    queryKey: ["productServiceLibrary"],
    queryFn: () => base44.entities.ProductServiceLibrary.filter({ is_active: true }),
  });

  const filtered = library.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.default_description || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(item) {
    setSearch(item.default_description || item.name);
    onChange(item.default_description || item.name);
    onSelect(item);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder={placeholder}
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border rounded-md shadow-lg max-h-56 overflow-y-auto">
          <div className="px-2 py-1.5 border-b flex items-center gap-1.5">
            <Search className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Product & Service Library</span>
          </div>
          {filtered.map(item => (
            <button
              key={item.id}
              className="w-full text-left px-3 py-2 hover:bg-muted text-xs flex flex-col gap-0.5 border-b last:border-0"
              onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
            >
              <span className="font-medium">{item.name}</span>
              {item.default_description && item.default_description !== item.name && (
                <span className="text-muted-foreground text-[10px] truncate">{item.default_description}</span>
              )}
              {item.default_unit_cost > 0 && (
                <span className="text-muted-foreground text-[10px]">${item.default_unit_cost.toLocaleString()} / {item.default_unit || "ls"}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}