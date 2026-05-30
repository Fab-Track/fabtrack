import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { projectMaterials, matchProjectionToInventory } from "@/lib/materialProjections";

export default function JobMaterialsSection({ jobId }) {
  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates", jobId],
    queryFn: () => base44.entities.Estimate.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 200),
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["materialReservations", jobId],
    queryFn: () => base44.entities.MaterialReservation.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  // Collect all line items from all estimates with railing/staircase flags
  const allLines = estimates.flatMap(est =>
    (est.line_items || []).map(li => ({
      ...li,
      // Re-detect railing/staircase from category/description since we strip flags on save
      _is_railing: reservations.some(r => r.estimate_id === est.id) || false,
    }))
  );

  // Build projections from reservations (which already know the materials)
  const jobReservations = reservations.filter(r => r.job_id === jobId);

  if (jobReservations.length === 0 && estimates.length === 0) return null;

  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          Materials
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No materials reserved for this job yet. Materials are reserved when an estimate is approved.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {["Material", "Reserved Qty", "Available", "Status"].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobReservations.map((res, i) => {
                  const invItem = inventoryItems.find(it => it.id === res.inventory_item_id);
                  const allReserved = reservations
                    .filter(r => r.inventory_item_id === res.inventory_item_id && r.status === "reserved")
                    .reduce((s, r) => s + (r.quantity || 0), 0);
                  const available = invItem ? (invItem.quantity_on_hand || 0) - allReserved : null;
                  const status = !invItem ? "untracked"
                    : available >= res.quantity ? "sufficient"
                    : "short";

                  return (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <p className="text-xs font-medium">{res.inventory_item_name}</p>
                        {res.inventory_item_sku && <p className="text-[11px] text-muted-foreground font-mono">{res.inventory_item_sku}</p>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{res.quantity} {res.unit || "lnft"}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {available !== null ? `${available} ${invItem?.unit || "lnft"}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {status === "sufficient" && (
                          <span className="flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sufficient
                          </span>
                        )}
                        {status === "short" && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Short
                          </span>
                        )}
                        {status === "untracked" && (
                          <span className="text-xs text-muted-foreground">Not Tracked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}