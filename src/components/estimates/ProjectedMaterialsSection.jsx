import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { projectMaterials, matchProjectionToInventory } from "@/lib/materialProjections";

export default function ProjectedMaterialsSection({ lines }) {
  const [open, setOpen] = useState(false);

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 200),
    enabled: open,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["materialReservations"],
    queryFn: () => base44.entities.MaterialReservation.filter({ status: "reserved" }),
    enabled: open,
  });

  // Augment lines with railing/staircase flags from saved data
  const projections = projectMaterials(lines);
  const anyShort = open && projections.some(p => {
    const { status } = matchProjectionToInventory(p.material, p.qty, inventoryItems, reservations);
    return status === "short";
  });

  if (projections.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      {anyShort && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            ⚠️ Some materials for this estimate may need to be ordered before fabrication
          </p>
        </div>
      )}

      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(p => !p)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          Projected Materials
          <span className="text-xs font-normal text-muted-foreground">({projections.length} materials)</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {["Material", "Qty Needed", "In Inventory", "Reserved", "Available", "Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projections.map((proj, i) => {
                const { inventoryItem, status, available, reserved } = matchProjectionToInventory(
                  proj.material, proj.qty, inventoryItems, reservations
                );
                return (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-xs">{proj.material}</p>
                      {proj.sources.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">{proj.sources.join(", ")}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold">{proj.qty} lnft</td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {inventoryItem ? `${inventoryItem.quantity_on_hand} ${inventoryItem.unit || "lnft"}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-amber-600">
                      {inventoryItem ? `${reserved ?? 0} ${inventoryItem.unit || "lnft"}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {inventoryItem ? `${available ?? 0} ${inventoryItem.unit || "lnft"}` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {status === "sufficient" && (
                        <span className="flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Have Enough
                        </span>
                      )}
                      {status === "short" && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Short
                        </span>
                      )}
                      {status === "untracked" && (
                        <span className="text-xs text-muted-foreground">— Not tracked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}