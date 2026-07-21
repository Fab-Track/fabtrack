import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Layers, CheckCircle2 } from "lucide-react";
import ComponentsSpec from "@/components/estimates/ComponentsSpec";
import { useAuth } from "@/lib/AuthContext";
import { canApproveScope, setLineApproval } from "@/lib/scopeApprovalHelpers";
import LineApprovalButtons from "@/components/jobs/LineApprovalButtons";
import ScopeApprovalBox from "@/components/jobs/ScopeApprovalBox";

/**
 * Shop-facing read-only scope view pulled from the approved estimate + change orders.
 * Shows Item, Qty, Color, Install Location — no pricing — plus manager review controls.
 */
export default function JobScopeSection({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canApprove = canApproveScope(user);

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
  const estLines = (approvedEstimate?.line_items || []).map((l, idx) => ({
    ...l, _src: { type: "Estimate", record: approvedEstimate, idx },
  }));
  const coLines = approvedCOs.flatMap(co =>
    (co.line_items || []).map((l, idx) => ({
      ...l,
      _co_label: `CO #${co.id?.slice(-6).toUpperCase()}`,
      _src: { type: "ChangeOrder", record: co, idx },
    }))
  );
  const allLines = [...estLines, ...coLines];

  const approveMutation = useMutation({
    mutationFn: ({ src, status }) =>
      setLineApproval({ entityType: src.type, record: src.record, lineIdx: src.idx, status, user }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates", job.id] });
      qc.invalidateQueries({ queryKey: ["changeOrders", job.id] });
    },
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20 flex-wrap">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Scope</h3>
        {approvedEstimate && (
          <Badge className="bg-emerald-100 text-emerald-800 text-xs ml-1">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        )}
        {approvedEstimate && (
          <div className="ml-auto">
            <ScopeApprovalBox job={job} />
          </div>
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
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Qty</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Color</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Install Location</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Manager Review</th>
              </tr>
            </thead>
            <tbody>
              {allLines.map((line, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">
                    {line.service_name || line.description || "—"}
                    {line._co_label && (
                      <Badge className="ml-2 text-xs bg-amber-100 text-amber-700 border-transparent">{line._co_label}</Badge>
                    )}
                    <ComponentsSpec components={line.components} />
                  </td>
                  <td className="px-4 py-2.5 text-right">{line.quantity ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{line.color || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {line.install_location && line.install_location !== "N/A" ? line.install_location : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <LineApprovalButtons
                      line={line}
                      canApprove={canApprove}
                      onSet={(status) => approveMutation.mutate({ src: line._src, status })}
                    />
                  </td>
                </tr>
              ))}
              {allLines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
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