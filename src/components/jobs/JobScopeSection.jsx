import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Layers, CheckCircle2 } from "lucide-react";

/**
 * Fabricator-friendly read-only scope view pulled from the approved estimate.
 * Hides all dollar amounts.
 */
export default function JobScopeSection({ job, isFabricator = false }) {
  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates", job.id],
    queryFn: () => base44.entities.Estimate.filter({ job_id: job.id }),
    enabled: !!job.id,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ["changeOrders", job.id],
    queryFn: () => base44.entities.ChangeOrder.filter({ job_id: job.id }),
    enabled: !!job.id,
  });

  const approvedEstimate = estimates.find(e => e.status === "Approved");
  const approvedCOs = changeOrders.filter(co => co.status === "Approved");
  const estLines = approvedEstimate?.line_items || [];
  const coLines = approvedCOs.flatMap(co =>
    (co.line_items || []).map(l => ({ ...l, _co_label: `CO #${co.id?.slice(-6).toUpperCase()}` }))
  );
  const allLines = [...estLines, ...coLines];

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Scope</h3>
        {approvedEstimate && (
          <Badge className="bg-emerald-100 text-emerald-800 text-xs ml-1">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        )}
      </div>

      {!approvedEstimate ? (
        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
          Scope not yet defined — awaiting estimate approval
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Item</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Description</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Qty</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Unit</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Install Location</th>
                {!isFabricator && (
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Amount</th>
                )}
              </tr>
            </thead>
            <tbody>
              {allLines.map((line, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">
                    {line.description?.split("—")[0]?.trim() || line.description || "—"}
                    {line._co_label && (
                      <Badge className="ml-2 text-xs bg-amber-100 text-amber-700 border-transparent">{line._co_label}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-xs">{line.description || "—"}</td>
                  <td className="px-4 py-2.5 text-right">{line.quantity ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{line.unit || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {line.install_location && line.install_location !== "N/A" ? line.install_location : "—"}
                  </td>
                  {!isFabricator && (
                    <td className="px-4 py-2.5 text-right font-semibold">
                      ${(line.total || (line.quantity || 0) * (line.unit_cost || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  )}
                </tr>
              ))}
              {allLines.length === 0 && (
                <tr>
                  <td colSpan={isFabricator ? 5 : 6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No line items on the approved estimate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}