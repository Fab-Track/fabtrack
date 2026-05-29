import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Plus } from "lucide-react";

export default function ProductServiceDropdown({ value, onChange, onSelect, placeholder = "Description" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const containerRef = useRef(null);

  // Pull from ServiceCatalog — same source as Settings → Service Catalog
  const { data: catalog = [] } = useQuery({
    queryKey: ["serviceCatalog", "active"],
    queryFn: () => base44.entities.ServiceCatalog.filter({ is_active: true }),
  });

  useEffect(() => { setSearch(value || ""); }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(item) {
    const desc = item.default_description || item.name;
    setSearch(desc);
    onChange(desc);
    onSelect({ ...item, show_photo: true });
    setOpen(false);
  }

  const q = search.toLowerCase();
  const filtered = catalog.filter(item =>
    item.name.toLowerCase().includes(q) ||
    (item.default_description || "").toLowerCase().includes(q)
  );

  // Group by ServiceCatalog `category` field, preserving sort_order within each group
  const categoryOrder = [];
  const categoryMap = {};
  filtered
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach(item => {
      const cat = item.category || "Other";
      if (!categoryMap[cat]) {
        categoryMap[cat] = [];
        categoryOrder.push(cat);
      }
      categoryMap[cat].push(item);
    });

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder={placeholder}
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-popover border rounded-md shadow-lg max-h-72 overflow-y-auto">
          <div className="sticky top-0 bg-popover px-2.5 py-1.5 border-b flex items-center gap-1.5">
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground">Service Catalog</span>
          </div>

          {categoryOrder.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-3">No matches found.</p>
          )}

          {categoryOrder.map(cat => (
            <div key={cat}>
              <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                {cat}
              </div>
              {categoryMap[cat].map(item => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex flex-col gap-0.5"
                  onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
                >
                  <span className="font-medium">{item.name}</span>
                  {item.default_description && item.default_description !== item.name && (
                    <span className="text-muted-foreground text-[10px] truncate">{item.default_description}</span>
                  )}
                  {item.default_unit_price > 0 && (
                    <span className="text-muted-foreground text-[10px]">${item.default_unit_price.toLocaleString()} / {item.unit || "ls"}</span>
                  )}
                </button>
              ))}
            </div>
          ))}

          <div className="border-t mt-1">
            <button
              className="w-full text-left px-3 py-2 hover:bg-muted text-xs flex items-center gap-1.5 text-muted-foreground"
              onMouseDown={e => { e.preventDefault(); setOpen(false); }}
            >
              <Plus className="w-3 h-3" />
              Custom item — type description manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}