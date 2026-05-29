import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Plus } from "lucide-react";

// Visual category display names for grouping (maps to default_category values stored on items)
const DISPLAY_GROUPS = ["Labor", "Material", "Sub-contractor", "Equipment", "Other"];

export default function ProductServiceDropdown({ value, onChange, onSelect, placeholder = "Description" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const containerRef = useRef(null);

  const { data: library = [] } = useQuery({
    queryKey: ["productServiceLibrary"],
    queryFn: () => base44.entities.ProductServiceLibrary.filter({ is_active: true }),
  });

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
    // Pass full item including photo_url so callers can set show_photo on the line
    onSelect({ ...item, show_photo: true });
    setOpen(false);
  }

  function handleCustomItem() {
    // Just close and let the user type freely
    setOpen(false);
  }

  const q = search.toLowerCase();
  const filtered = library.filter(item =>
    item.name.toLowerCase().includes(q) ||
    (item.default_description || "").toLowerCase().includes(q)
  );

  // Build grouped structure; when searching show category headers inline
  const grouped = [];
  const usedCategories = new Set(filtered.map(i => i.default_category || "Other"));
  const orderedCats = [...DISPLAY_GROUPS.filter(c => usedCategories.has(c)),
    ...[...usedCategories].filter(c => !DISPLAY_GROUPS.includes(c))];

  orderedCats.forEach(cat => {
    const items = filtered.filter(i => (i.default_category || "Other") === cat).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
    if (items.length > 0) grouped.push({ cat, items });
  });

  const showDropdown = open && (filtered.length > 0 || true); // always show when focused so custom item appears

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
            <span className="text-[10px] text-muted-foreground">Product & Service Library</span>
          </div>

          {grouped.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-3">No matches found.</p>
          )}

          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                {cat}
              </div>
              {items.map(item => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex flex-col gap-0.5"
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
          ))}

          <div className="border-t mt-1">
            <button
              className="w-full text-left px-3 py-2 hover:bg-muted text-xs flex items-center gap-1.5 text-muted-foreground"
              onMouseDown={e => { e.preventDefault(); handleCustomItem(); }}
            >
              <Plus className="w-3 h-3" />
              Custom Item — type description manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}