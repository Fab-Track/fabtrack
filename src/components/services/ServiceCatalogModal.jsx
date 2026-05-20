import React, { useState, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, AlertCircle } from "lucide-react";
import { CATALOG_CATEGORIES } from "@/lib/serviceCatalogData";

/**
 * ServiceCatalogModal
 * Props:
 *   open: bool
 *   onClose: fn
 *   catalogItems: ServiceCatalog[] (active items from DB)
 *   onSelect: fn(item) — called when user picks a catalog item
 *   onCustom: fn() — called when user wants a blank custom service
 *   filterNames: string[] | null — if set, show only these names (pre-filter for recommendations)
 *   preCheckedNames: string[] — names to show as "suggested" highlighted
 */
export default function ServiceCatalogModal({
  open,
  onClose,
  catalogItems = [],
  onSelect,
  onCustom,
  filterNames = null,
  preCheckedNames = [],
}) {
  const [search, setSearch] = useState("");

  const activeItems = useMemo(() => {
    let items = catalogItems.filter(i => i.is_active !== false);
    if (filterNames && filterNames.length > 0) {
      items = items.filter(i => filterNames.includes(i.name));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.default_description || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [catalogItems, filterNames, search]);

  const grouped = useMemo(() => {
    return CATALOG_CATEGORIES.reduce((acc, cat) => {
      const items = activeItems.filter(i => i.category === cat);
      if (items.length) acc[cat] = items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return acc;
    }, {});
  }, [activeItems]);

  const hasResults = Object.keys(grouped).length > 0;
  const isFiltered = !!filterNames;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b">
          <h2 className="font-semibold text-base mb-3">
            {isFiltered ? "Suggested Services" : "Add Service from Catalog"}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services…"
              className="pl-9 h-9"
              autoFocus
            />
          </div>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 px-2 py-2">
          {!hasResults && (
            <p className="text-sm text-muted-foreground text-center py-8">No matching services found.</p>
          )}
          {CATALOG_CATEGORIES.map(cat => {
            const items = grouped[cat];
            if (!items) return null;
            return (
              <div key={cat} className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1">{cat}</p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const isSuggested = preCheckedNames.includes(item.name);
                    const isZero = !item.default_unit_price || item.default_unit_price === 0;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { onSelect(item); onClose(); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors flex items-center justify-between gap-3 group ${isSuggested ? "bg-amber-50 border border-amber-200" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{item.name}</span>
                            {isSuggested && (
                              <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-300">Suggested</Badge>
                            )}
                          </div>
                          {item.default_description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.default_description}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-semibold ${isZero ? "text-amber-600" : "text-foreground"}`}>
                            {isZero ? "$ TBD" : `$${item.default_unit_price.toLocaleString()}`}
                          </p>
                          <p className="text-xs text-muted-foreground">/{item.unit}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between bg-muted/20">
          <button
            onClick={() => { onCustom?.(); onClose(); }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Custom Service (blank form)
          </button>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}