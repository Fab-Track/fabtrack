import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EstimateCustomerView from "@/components/estimates/EstimateCustomerView";
import { toast } from "sonner";

export default function EstimateView() {
  const { token } = useParams();
  const qc = useQueryClient();

  const { data, isLoading: loadingEst } = useQuery({
    queryKey: ["estimate-public", token],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("getPublicDocument", { type: "estimate", token });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!token,
    retry: false,
  });

  const estimate = data?.document;
  const job = data?.job;
  const customer = data?.customer;
  const contractText = data?.contract_text || null;

  const approve = useMutation({
    mutationFn: (customerName) => base44.functions.invoke("approvePublicEstimate", { token, customerName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimate-public", token] });
      toast.success("Estimate approved — thank you!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to approve estimate. Please try again.");
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
        contractText={contractText}
      />
      {approve.isPending && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl text-sm">Saving approval…</div>
        </div>
      )}
    </div>
  );
}