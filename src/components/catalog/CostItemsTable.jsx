import React from "react";
import { itemStatus, METHOD_LABELS, stickLabel, costColumn } from "@/lib/costItems";

const STATUS_STYLE = {
  OK: "bg-blue-100 text-blue-900",
  "Check unit": "bg-amber-100 text-amber-900",
  "Needs review": "bg-red-100 text-red-900",
};
const GRID = "grid grid-cols-[minmax(160px,1.4fr)_minmax(90px,0.8fr)_minmax(110px,1fr)_90px_110px_90px_minmax(130px,1.1fr)_110px]";

function Chip({ children, className = "bg-muted text-foreground" }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>;
}

export default function CostItemsTable({ items, costCodes, total, loading, hasMore, onMore, onEdit }) {
  const codeName = (id) => costCodes.find((c) => c.id === id)?.name;
  return (
    <div className="bg-card border rounded-xl overflow-x-auto shadow-sm">
      <div className="min-w-[900px]">
        <div className={`${GRID} gap-3 px-4 py-2.5 bg-muted/40 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase`}>
          <span>Name</span><span>Shape</span><span>Used as</span><span>Costed by</span>
          <span>Stick</span><span className="text-right">Cost / ft</span><span>Cost codes</span><span>Status</span>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No cost items match.</p>
        ) : items.map((m) => {
          const status = itemStatus(m);
          const uses = (m.component_type || []).filter(Boolean);
          return (
            <button key={m.id} onClick={() => onEdit(m)} className={`${GRID} gap-3 w-full text-left items-center px-4 py-3 border-t hover:bg-muted/30`}>
              <span className="font-mono text-xs font-semibold uppercase">{m.name}</span>
              <span className="text-sm">{m.category}</span>
              <span className="flex flex-wrap gap-1">{uses.length ? uses.map((u) => <Chip key={u}>{u}</Chip>) : <Chip>—</Chip>}</span>
              <span className="text-sm">{METHOD_LABELS[m.cost_method || "linear_foot"]}</span>
              <span className="font-mono text-xs text-muted-foreground">{stickLabel(m)}</span>
              <span className="font-mono text-sm font-semibold text-right">{costColumn(m)}</span>
              <span className="flex flex-wrap gap-1">
                {(m.cost_code_ids || []).map((id) => codeName(id) && <Chip key={id} className="bg-primary/15 text-foreground">{codeName(id)}</Chip>)}
              </span>
              <span><Chip className={STATUS_STYLE[status]}>{status}</Chip></span>
            </button>
          );
        })}
        <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
          <span>Showing {items.length} of {total}</span>
          {hasMore && <button className="font-semibold text-foreground underline" onClick={onMore}>Show more</button>}
        </div>
      </div>
    </div>
  );
}