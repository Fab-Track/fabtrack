import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Plus, PenLine, X } from "lucide-react";
import { toast } from "sonner";

export default function ProductServiceDropdown({ value, onChange, onSelect, placeholder = "Service item" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const [customMode, setCustomMode] = useState(false);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const { data: catalog = [] } = useQuery({
    queryKey: ["serviceCatalog", "active"],
    queryFn: () => base44.entities.ServiceCatalog.filter({ is_active: true }),
  });

  useEffect(() => { setSearch(value || ""); }, [value]);

  // Calculate position on open and on resize
  const recalcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(500, window.innerHeight * 0.6);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Decide whether to open downward or upward
    const openDownward = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove;

    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 380)),
      width: Math.max(360, Math.min(rect.width, window.innerWidth - 16)),
      top: openDownward
        ? rect.bottom + 4
        : rect.top - dropdownHeight - 4,
      maxHeight: dropdownHeight,
      openDownward,
    });
  }, []);

  useEffect(() => {
    if (open) {
      recalcPosition();
      window.addEventListener("resize", recalcPosition);
      window.addEventListener("scroll", recalcPosition, true);
    }
    return () => {
      window.removeEventListener("resize", recalcPosition);
      window.removeEventListener("scroll", recalcPosition, true);
    };
  }, [open, recalcPosition]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(item) {
    setCustomMode(false);
    setSearch(item.name);
    onChange(item.name);
    onSelect({ ...item, show_photo: true });
    setOpen(false);
  }

  function handleCustom() {
    setCustomMode(true);
    setSearch("");
    onChange("");
    onSelect({ isCustom: true, name: "" });
    setOpen(false);
    toast.info("Custom item started", { description: "Type a name and description — this line won't be linked to the Service Catalog." });
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function exitCustom() {
    setCustomMode(false);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const q = search.toLowerCase();
  const filtered = catalog.filter(item =>
    item.name.toLowerCase().includes(q) ||
    (item.default_description || "").toLowerCase().includes(q)
  );

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
    <div className="relative w-full">
      <div ref={triggerRef} className="relative">
        <input
          ref={inputRef}
          className={`flex h-8 w-full rounded-md border bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 ${
            customMode
              ? "border-warning ring-1 ring-warning/40 pr-[4.5rem] focus-visible:ring-warning"
              : "border-input focus-visible:ring-ring"
          }`}
          placeholder={customMode ? "Custom item name…" : placeholder}
          value={search}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value); if (!customMode) setOpen(true); }}
          onFocus={() => { if (!customMode) setOpen(true); }}
        />
        {customMode && (
          <button
            type="button"
            title="Back to Service Catalog"
            onClick={exitCustom}
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded bg-warning/15 text-warning-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide hover:bg-warning/25 transition-colors"
          >
            <PenLine className="w-3 h-3" />
            Custom
            <X className="w-3 h-3 opacity-60" />
          </button>
        )}
      </div>
      {customMode && (
        <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
          Not linked to the Service Catalog — enter the description and pricing manually.
        </p>
      )}

      {open && !customMode && (
        <div
          ref={dropdownRef}
          className="fixed z-[100] bg-popover border rounded-lg shadow-2xl overflow-hidden flex flex-col"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
          }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-popover px-3 py-2 border-b flex items-center gap-2 shrink-0">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium">Service Catalog</span>
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto flex-1">
            {categoryOrder.length === 0 && (
              <p className="text-sm text-muted-foreground px-4 py-6 text-center">No matches found.</p>
            )}

            {categoryOrder.map(cat => (
              <div key={cat}>
                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none sticky top-0 bg-popover/95 backdrop-blur-sm z-[5]">
                  {cat}
                  <span className="ml-2 font-normal normal-case text-[10px] text-muted-foreground/60">
                    ({categoryMap[cat].length})
                  </span>
                </div>
                {categoryMap[cat].map(item => (
                  <button
                    key={item.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex flex-col gap-0.5 min-h-[44px] justify-center"
                    onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
                  >
                    <span className="font-medium text-sm">{item.name}</span>
                    {item.default_description && item.default_description !== item.name && (
                      <span className="text-muted-foreground text-xs leading-tight">{item.default_description}</span>
                    )}
                    {item.default_unit_price > 0 && (
                      <span className="text-muted-foreground text-xs">${item.default_unit_price.toLocaleString()} / {item.unit || "ls"}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Custom item button */}
          <div className="border-t shrink-0">
            <button
              className="w-full text-left px-4 py-3 hover:bg-muted text-sm flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
              onMouseDown={e => { e.preventDefault(); handleCustom(); }}
            >
              <Plus className="w-4 h-4" />
              Custom item — type description manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}