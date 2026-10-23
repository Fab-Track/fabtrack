import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/costGroups";
import { aggregateMaterials } from "@/lib/railingTakeoff";

const r2 = (n) => Math.round((n || 0) * 100) / 100;

export default function TakeoffDialog({ line, materials = [], onClose, onApply }) {
  const t = line?._railing_takeoff;
  const s = t?.steps;

  // Local editable quantities, initialized from the line's computed components
  const [quantities, setQuantities] = useState(() => (line?.components || []).map((c) => c.qty));

  // Reset when a different line is opened
  useEffect(() => {
    setQuantities((line?.components || []).map((c) => c.qty));
  }, [line?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build component results with (possibly overridden) quantities
  const componentResults = useMemo(
    () =>
      (line?.components || []).map((c, i) => ({
        ...c,
        qty: quantities[i] ?? c.qty,
        cost: r2((quantities[i] ?? c.qty) * (c.unit_cost || 0)),
      })),
    [line?.components, quantities]
  );

  // Recalculate aggregated materials with overridden quantities
  const aggMats = useMemo(() => aggregateMaterials(componentResults, materials), [componentResults, materials]);

  // Recalculate costs (fab/powder/install don't change with material qty overrides)
  const newMaterialCost = r2(aggMats.reduce((sum, m) => sum + m.material_cost, 0));
  const oldBreakdown = line?.cost_breakdown || {};
  const newHardCost = r2(newMaterialCost + (oldBreakdown.fabrication || 0) + (oldBreakdown.powder_coat || 0) + (oldBreakdown.install || 0));

  const cells = s
    ? [
        ["Posts", s.posts],
        ["Section length", `${s.sectionLength.toFixed(2)} ft`],
        ["Pickets / section", s.picketsPerSection],
        ["Total pickets", s.totalPickets],
        ["Post height", `${s.postHeight}"`],
        ["Rail runs", t.params?.rail_runs],
      ]
    : [];
  const th = "px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

  const hasOverride = (line?.components || []).some((c, i) => (quantities[i] ?? c.qty) !== c.qty);
  const origMaterialCost = (t?.aggregatedMaterials || []).reduce((sum, m) => sum + m.material_cost, 0);
  const costDiff = newMaterialCost - r2(origMaterialCost);

  function handleApply() {
    onApply?.({
      components: componentResults.map((c) => ({ ...c, cost: r2(c.cost) })),
      aggregatedMaterials: aggMats,
      hard_cost: newHardCost,
      cost_breakdown: { ...oldBreakdown, materials: newMaterialCost },
    });
    onClose();
  }

  function resetOverride() {
    setQuantities((line?.components || []).map((c) => c.qty));
  }

  return (
    <Dialog open={!!line} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Takeoff · {line?.service_name} · {line?.quantity} {line?.unit}
          </DialogTitle>
        </DialogHeader>

        {cells.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {cells.map(([l, v]) => (
              <div key={l} className="bg-muted/40 rounded-lg p-2">
                <p className="text-[11px] text-muted-foreground">{l}</p>
                <p className="font-mono font-bold">{v}</p>
              </div>
            ))}
          </div>
        )}

        {/* Component quantities — editable */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Components</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className={th}>Slot</th>
                <th className={th}>Material</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} text-right`}>Cost / ft</th>
              </tr>
            </thead>
            <tbody>
              {componentResults.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5">{c.slot}</td>
                  <td className="px-2 py-1.5">{c.material}</td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Input
                        type="number"
                        step="any"
                        className="h-7 w-20 text-right font-mono text-xs"
                        value={quantities[i] ?? ""}
                        onChange={(e) =>
                          setQuantities((prev) => {
                            const next = [...prev];
                            next[i] = parseFloat(e.target.value) || 0;
                            return next;
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">{c.qty_unit}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">{money(c.unit_cost || 0, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Aggregated materials with stick quantities */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Material sticks (combined &amp; rounded up)
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className={th}>Material</th>
                <th className={`${th} text-right`}>Total ft</th>
                <th className={`${th} text-right`}>Stick len</th>
                <th className={`${th} text-right`}>Sticks</th>
                <th className={`${th} text-right`}>Cost / stick</th>
                <th className={`${th} text-right`}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {aggMats.map((m, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1.5">{m.material_name}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{m.total_qty.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{m.stock_length_ft || "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold">{m.sticks || "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{m.cost_per_stick ? money(m.cost_per_stick) : "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold">{money(m.material_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost summary */}
        <div className="space-y-1 border-t pt-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Materials (sticks):</span>
            <span className="font-mono">{money(newMaterialCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fabrication:</span>
            <span className="font-mono">{money(oldBreakdown.fabrication || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Powder coat:</span>
            <span className="font-mono">{money(oldBreakdown.powder_coat || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Install:</span>
            <span className="font-mono">{money(oldBreakdown.install || 0)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-bold">
            <span>Hard cost:</span>
            <span className="font-mono">{money(newHardCost)}</span>
          </div>
          {hasOverride && costDiff !== 0 && (
            <p className={`text-xs ${costDiff > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              Material cost {costDiff > 0 ? "increased" : "decreased"} by {money(Math.abs(costDiff))} from catalog calculation.
            </p>
          )}
        </div>

        {hasOverride && (
          <p className="text-xs text-amber-700">Quantities adjusted — click Apply to save overrides to this line.</p>
        )}

        <div className="flex justify-end gap-2">
          {hasOverride && (
            <Button variant="outline" onClick={resetOverride}>
              Reset
            </Button>
          )}
          <Button onClick={handleApply} disabled={!hasOverride}>
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}