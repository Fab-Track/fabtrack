import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Layers, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { canApproveScope } from "@/lib/scopeApprovalHelpers";
import ScopeApprovalBox from "@/components/jobs/ScopeApprovalBox";
import ProductScopeBlock from "@/components/jobs/ProductScopeBlock";

/**
 * Shop-facing scope view — pulled from the job's Product Details
 * (job_level_data.product_details), not invoices. Shows one block per
 * product entry with only the filled fields, plus per-product manager
 * approval controls and a job-level scope sign-off.
 */
export default function JobScopeSection({ job, isFabricator }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canApprove = canApproveScope(user) && !isFabricator;

  const entries = job.job_level_data?.product_details || [];
  const hasEntries = entries.length > 0;

  const approvalMutation = useMutation({
    mutationFn: async ({ idx, status }) => {
      const fresh = await base44.entities.Job.get(job.id);
      const details = [...(fresh.job_level_data?.product_details || [])];
      const entry = { ...(details[idx] || {}) };
      if (!status) {
        delete entry.mgr_approval;
      } else {
        entry.mgr_approval = {
          status,
          at: new Date().toISOString(),
          by_id: user?.id || "",
          by_name: user?.full_name || "",
        };
      }
      details[idx] = entry;
      return base44.entities.Job.update(job.id, {
        job_level_data: { ...(fresh.job_level_data || {}), product_details: details },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job", job.id] }),
  });

  const allApproved = hasEntries && entries.every((e) => e.mgr_approval?.status === "approved");

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20 flex-wrap">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Scope</h3>
        {allApproved && (
          <Badge className="bg-emerald-100 text-emerald-800 text-xs ml-1">
            <CheckCircle2 className="w-3 h-3 mr-1" /> All Approved
          </Badge>
        )}
        {hasEntries && (
          <div className="ml-auto">
            <ScopeApprovalBox job={job} />
          </div>
        )}
      </div>

      {!hasEntries ? (
        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
          No products added yet — fill out the Product Details on the Details tab.
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {entries.map((entry, i) => (
            <ProductScopeBlock
              key={entry.id || i}
              entry={entry}
              index={i}
              canApprove={canApprove}
              onSetApproval={(status) => approvalMutation.mutate({ idx: i, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}