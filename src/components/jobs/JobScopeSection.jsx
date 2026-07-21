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
 * Shop-facing read-only scope view — pulled from PAID invoices only
 * (not the estimate). Shows Item, Qty, Color, Install Location, plus
 * manager review controls.
 */
export default function JobScopeSection({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canApprove = canApproveScope(user);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", job.id],
    queryFn: () => base44.entities.Invoice.filter({ job_id: job.id }),
    enabled: !!job.id,
  });

  const paidInvoices = invoices.filter(inv => inv.status === "Paid");
  const allLines = paidInvoices.flatMap(inv =>
    (inv.line_items || []).map((l, idx) => ({
      ...l,
      _co_label: inv.invoice_label && inv.invoice_label !== "Final Invoice" ? inv.invoice_label : null,
      _src: { type: "Invoice", record: inv, idx },
    }))
  );

  const approveMutation = useMutation({
    mutationFn: ({ src, status }) =>
      setLineApproval({ entityType: src.type, record: src.record, lineIdx: src.idx, status, user }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices", job.id] }),
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20 flex-wrap">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Scope</h3>
        {paidInvoices.length > 0 && (
          <Badge className="bg-emerald-100 text-emerald-800 text-xs ml-1">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
          </Badge>
        )}
        {paidInvoices.length > 0 && (
          <div className="ml-auto">
            <ScopeApprovalBox job={job} />
          </div>
        )}
      </div>

      {paidInvoices.length === 0 ? (
        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
          Scope not yet visible — awaiting a paid invoice
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
                    No line items on the paid invoice(s).
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