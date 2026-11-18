import React from "react";
import CostItemMatchPicker from "./CostItemMatchPicker";

const CHIP = {
  update: "bg-emerald-100 text-emerald-900",
  add: "bg-muted text-foreground",
  skip: "bg-red-100 text-red-900",
};
const GRID = "grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_120px] gap-3 items-center px-3 py-2.5";

export default function CostItemsImportRow({ row, existing, usedIds, onChange }) {
  const v = row.values || {};
  const sub = [v.sku && `SKU ${v.sku}`, v.category, v.supplier].filter(Boolean).join(" · ");
  const auto = row.matchId && row.matchFrom && row.matchId === row.suggested;

  if (row.invalid) {
    return (
      <div className={GRID}>
        <span className="text-sm text-muted-foreground">Row without a name</span>
        <span className="text-xs text-muted-foreground">Not imported</span>
        <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${CHIP.skip}`}>Skipped</span>
      </div>
    );
  }

  return (
    <div className={GRID}>
      <span className="min-w-0">
        <span className="block font-mono text-xs font-semibold uppercase truncate">{v.name}</span>
        <span className="block text-[11px] text-muted-foreground truncate">{sub || "—"}</span>
      </span>
      <CostItemMatchPicker existing={existing} value={row.matchId} usedIds={usedIds} onChange={(id) => onChange(row.key, id)} />
      <span className="min-w-0">
        <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${row.matchId ? CHIP.update : CHIP.add}`}>
          {row.matchId ? "Update" : "New"}
        </span>
        {auto && <span className="block text-[10px] text-muted-foreground mt-1">{row.matchFrom} match</span>}
        {!row.matchId && row.ambiguous > 0 && (
          <span className="block text-[10px] text-amber-700 mt-1">{row.ambiguous} name matches</span>
        )}
      </span>
    </div>
  );
}