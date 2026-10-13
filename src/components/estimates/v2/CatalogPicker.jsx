import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function CatalogPicker({ open, onOpenChange, categories, items, onPick, onCustom }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const active = items.filter((i) => i.is_active !== false && (!term || (i.name || "").toLowerCase().includes(term)));
    return categories
      .map((c) => ({ cat: c, list: active.filter((i) => i.category_id === c.id) }))
      .filter((g) => g.list.length > 0);
  }, [q, categories, items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader><DialogTitle>Add from catalog</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input autoFocus className="pl-9" placeholder="Search cost groups" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-y-auto space-y-4 flex-1">
          {groups.map(({ cat, list }) => (
            <div key={cat.id}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {cat.name}{cat.is_fixed_price ? " · fixed price" : ""}
              </p>
              {list.map((i) => (
                <button key={i.id} type="button" onClick={() => { onPick(i, cat); setQ(""); }} className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted">
                  {i.name}
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No cost groups found.</p>}
        </div>
        <button type="button" onClick={() => { onCustom(); setQ(""); }} className="text-sm text-primary underline text-left">+ Custom line (type your own price)</button>
      </DialogContent>
    </Dialog>
  );
}