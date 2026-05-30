import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function WeeklyReviewPanel({ open, onClose }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [edits, setEdits] = useState({}); // { reservationId: actualQty }

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs-fab"],
    queryFn: () => base44.entities.Job.list(),
    enabled: open,
    select: (jobs) => jobs.filter(j =>
      ["In Fabrication", "Fabrication Complete"].includes(j.stage) ||
      j.status === "In Fabrication"
    ),
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["materialReservations"],
    queryFn: () => base44.entities.MaterialReservation.filter({ status: "reserved" }),
    enabled: open,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 200),
    enabled: open,
  });

  // Group reservations by job_id
  const reservationsByJob = {};
  for (const r of reservations) {
    if (!reservationsByJob[r.job_id]) reservationsByJob[r.job_id] = [];
    reservationsByJob[r.job_id].push(r);
  }

  // Jobs that have reservations
  const jobsWithReservations = jobs.filter(j => reservationsByJob[j.id]?.length > 0);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const confirmedBy = user?.full_name || user?.email || "Shop Manager";

      for (const [resId, actualQty] of Object.entries(edits)) {
        const reservation = reservations.find(r => r.id === resId);
        if (!reservation) continue;

        const projected = reservation.quantity;
        const actual = parseFloat(actualQty) ?? projected;
        const variancePct = projected > 0 ? Math.abs((actual - projected) / projected) * 100 : 0;
        const highVariance = variancePct > 20;

        // Deduct from inventory
        const invItem = inventoryItems.find(i => i.id === reservation.inventory_item_id);
        if (invItem) {
          const newQty = Math.max(0, (invItem.quantity_on_hand || 0) - actual);
          await base44.entities.InventoryItem.update(invItem.id, { quantity_on_hand: newQty });
        }

        // Update reservation to deducted
        await base44.entities.MaterialReservation.update(resId, {
          status: "deducted",
          actual_quantity: actual,
          deducted_at: now,
          deducted_by: confirmedBy,
        });

        // Create deduction log
        await base44.entities.InventoryDeductionLog.create({
          job_id: reservation.job_id,
          job_number: reservation.job_number,
          job_name: reservation.job_name,
          inventory_item_id: reservation.inventory_item_id,
          inventory_item_name: reservation.inventory_item_name,
          projected_quantity: projected,
          actual_quantity: actual,
          variance_pct: Math.round(variancePct),
          high_variance: highVariance,
          confirmed_by: confirmedBy,
          confirmed_at: now,
          note: highVariance ? `Actual usage was ${Math.round(variancePct)}% ${actual > projected ? "higher" : "lower"} than projected` : "",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(["inventory"]);
      qc.invalidateQueries(["materialReservations"]);
      toast.success("Deductions confirmed and inventory updated");
      onClose();
    },
  });

  function getEditQty(resId, defaultQty) {
    return edits[resId] !== undefined ? edits[resId] : defaultQty;
  }

  const allReservationsInEdits = reservations
    .filter(r => jobs.find(j => j.id === r.job_id))
    .every(r => edits[r.id] !== undefined);

  // Auto-populate all if not set
  function initAllEdits() {
    const init = {};
    for (const r of reservations) {
      init[r.id] = r.quantity;
    }
    setEdits(init);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weekly Inventory Review & Deduct</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Review projected vs actual material usage for jobs in fabrication. Adjust quantities if needed, then confirm to deduct from inventory and clear reservations.
          </p>
        </DialogHeader>

        {jobsWithReservations.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No jobs currently in fabrication with reserved materials.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={initAllEdits}>
                Pre-fill all with projected quantities
              </Button>
            </div>
            {jobsWithReservations.map(job => {
              const jobRes = reservationsByJob[job.id] || [];
              return (
                <div key={job.id} className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/40 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{job.job_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{job.job_number}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{job.stage || job.status}</Badge>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Material</th>
                        <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Projected</th>
                        <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">Actual Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {jobRes.map(res => {
                        const actual = getEditQty(res.id, res.quantity);
                        const variance = res.quantity > 0 ? Math.abs((parseFloat(actual) - res.quantity) / res.quantity) * 100 : 0;
                        return (
                          <tr key={res.id}>
                            <td className="px-3 py-2">
                              <p className="text-xs font-medium">{res.inventory_item_name}</p>
                              {res.inventory_item_sku && <p className="text-[11px] text-muted-foreground font-mono">{res.inventory_item_sku}</p>}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{res.quantity}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="h-7 w-24 text-xs"
                                  value={actual}
                                  onChange={e => setEdits(prev => ({ ...prev, [res.id]: e.target.value }))}
                                />
                                {variance > 20 && (
                                  <span className="text-[11px] text-amber-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {Math.round(variance)}% variance
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending || jobsWithReservations.length === 0}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {confirmMutation.isPending ? "Confirming…" : "Confirm Deductions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}