import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ComponentRow from "@/components/settings/ComponentRow";
import AddMaterialDialog from "@/components/settings/AddMaterialDialog";
import { money } from "@/lib/costGroups";

export default function ComponentsCard({ rows, setRows, results, materials, layout, length, railing, dirty, saving, onSave, orgId, refresh }) {
  const [addIdx, setAddIdx] = useState(null);
  const change = (idx, f, v) => setRows((p) => p.map((r, i) => (i === idx ? { ...r, [f]: v } : r)));
  const setMat = (idx, m) => setRows((p) => p.map((r, i) => (i === idx ? { ...r, material_id: m.id, material_name: m.name } : r)));
  const total = results.reduce((s, r) => s + (r?.cost || 0), 0);
  const th = "px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-5 flex-wrap">
        <h3 className="text-lg font-bold">Components</h3>
        <div className="flex gap-2">
          {dirty && <Button size="sm" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save components"}</Button>}
          <Button size="sm" variant="outline" onClick={() => setRows((p) => [...p, { slot: "Other", label: "", material_id: "", material_name: "", qty_per_unit: 0, fixed_qty: 0, waste_pct: 0 }])}>
            + Add component (plates, anchors, caps…)
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-muted/40">
            <tr>
              <th className={th}>Slot</th><th className={th}>Cost item</th><th className={th}>How it's counted</th>
              <th className={`${th} text-right`}>Feet / Qty</th><th className={`${th} text-right`}>Cost / ft</th><th className={`${th} text-right`}>Cost</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No components yet.</td></tr>}
            {rows.map((row, idx) => (
              <ComponentRow key={idx} row={row} idx={idx} isRailing={railing} materials={materials} layout={layout} length={length}
                result={results[idx]} onChange={change} onMaterial={setMat} onRemove={(i) => setRows((p) => p.filter((_, k) => k !== i))} onAddNew={setAddIdx} />
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot><tr className="border-t bg-muted/20">
              <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold">Materials</td>
              <td className="px-3 py-2 text-right font-mono font-bold">{money(total)}</td><td />
            </tr></tfoot>
          )}
        </table>
      </div>
      <AddMaterialDialog open={addIdx !== null} onOpenChange={(o) => !o && setAddIdx(null)} orgId={orgId}
        onCreated={(mat) => { refresh(); if (addIdx !== null) setMat(addIdx, mat); setAddIdx(null); }} />
    </div>
  );
}