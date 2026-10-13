import React from "react";
import { isReady, unitChip } from "@/lib/costGroups";

export default function CategoryGrid({ categories, items, onOpen }) {
  if (!categories.length) {
    return <div className="bg-card border rounded-xl p-10 text-center text-sm text-muted-foreground">No categories yet. Add one to get started.</div>;
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Each category holds its cost groups (styles). A cost group is ready to quote once it has components and a cost model.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const list = items.filter((i) => i.category_id === cat.id);
          const ready = list.filter((i) => isReady(i, cat)).length;
          const pct = list.length ? (ready / list.length) * 100 : 0;
          return (
            <button key={cat.id} type="button" onClick={() => onOpen(cat.id)} className="text-left bg-card border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-bold leading-tight">{cat.name}</h3>
                {unitChip(cat) && <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-[11px]">{unitChip(cat)}</span>}
              </div>
              <p className="text-sm text-muted-foreground min-h-[3rem]">{list.map((i) => i.name).join(", ") || "No cost groups yet"}</p>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold">{list.length} {list.length === 1 ? "group" : "groups"}</span>
                  <span className="text-muted-foreground">{ready} of {list.length} ready to quote</span>
                </div>
                <div className="h-1 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}