import React from "react";
import { money } from "@/lib/costGroups";

const fmt = (n, d = 1) => (n == null ? "—" : Number(n).toFixed(d));
const th = "px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right";
const td = "px-3 py-2 font-mono text-right";

export default function MaterialsStockCard({ lines, costingMode }) {
  const list = lines || [];
  const total = list.reduce((a, l) => a + l.material_cost, 0);
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="p-5 pb-3">
        <h3 className="text-lg font-bold">Stock & materials</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {costingMode === "Per foot used"
            ? "Charged per foot used."
            : "Rounded up to whole sticks at their stock length."} Pooled by cost item across every slot.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cost item</th>
              <th className={th}>Net</th>
              <th className={th}>Sticks</th>
              <th className={th}>Stock</th>
              <th className={th}>Waste</th>
              <th className={th}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Assign cost items to the components to see stock.</td></tr>
            )}
            {list.map((l) => (
              <tr key={l.material_id} className="border-t">
                <td className="px-3 py-2">{l.material_name}</td>
                <td className={td}>{fmt(l.total_qty)} {l.qty_unit}</td>
                <td className={td}>{l.cost_method === "unit" ? "—" : l.sticks}</td>
                <td className={td}>{l.stock_length_ft > 0 ? `${l.stock_length_ft} ft` : "—"}</td>
                <td className={td}>{l.sticks > 0 ? `${fmt(l.leftover_ft)} ft` : "—"}</td>
                <td className={`${td} font-bold`}>{money(l.material_cost)}</td>
              </tr>
            ))}
          </tbody>
          {list.length > 0 && (
            <tfoot><tr className="border-t bg-muted/20">
              <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold">Materials</td>
              <td className="px-3 py-2 text-right font-mono font-bold">{money(total)}</td>
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}