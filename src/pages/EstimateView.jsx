import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { autoMoveSalesStage } from "@/lib/salesPipelineTriggers";
import EstimateCustomerView from "@/components/estimates/EstimateCustomerView";
import { toast } from "sonner";

export default function EstimateView() {
  const { estimateId } = useParams();
  const qc = useQueryClient();

  const { data: estimate, isLoading: loadingEst } = useQuery({
    queryKey: ["estimate-public", estimateId],
    queryFn: () => base44.entities.Estimate.list().then(es => es.find(e => e.id === estimateId)),
    enabled: !!estimateId,
  });

  const { data: job } = useQuery({
    queryKey: ["job-public", estimate?.job_id],
    queryFn: () => base44.entities.Job.list().then(js => js.find(j => j.id === estimate.job_id)),
    enabled: !!estimate?.job_id,
  });

  const { data: customer } = useQuery({
    queryKey: ["customer-public", job?.customer_id],
    queryFn: () => base44.entities.Customer.list().then(cs => cs.find(c => c.id === job.customer_id)),
    enabled: !!job?.customer_id,
  });

  const approve = useMutation({
    mutationFn: (customerName) =>
      base44.entities.Estimate.update(estimateId, {
        status: "Approved",
        customer_signature: customerName,
        approved_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: async (_, customerName) => {
      // Update job and trigger pipeline move
      if (job) {
        await base44.entities.Job.update(job.id, {
          estimate_total: estimate?.total,
          customer_approval_status: "approved",
        });
        await autoMoveSalesStage(
          { ...job, estimate_total: estimate?.total },
          "Awaiting Deposit",
          `Estimate approved by ${customerName} via customer link`,
          customerName
        );
      }
      qc.invalidateQueries(["estimate-public", estimateId]);
      toast.success("Estimate approved — thank you!");
    },
  });

  if (loadingEst) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading estimate…</p>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Estimate not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <EstimateCustomerView
        estimate={estimate}
        job={job}
        customer={customer}
        businessInfo={{ address: "High Country Metal Works", phone: "" }}
        onApprove={(name) => approve.mutate(name)}
      />
      {approve.isPending && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl text-sm">Saving approval…</div>
        </div>
      )}
    </div>
  );
}