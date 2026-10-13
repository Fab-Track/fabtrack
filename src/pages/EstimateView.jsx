import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CustomerEstimateDoc from "@/components/estimates/customer/CustomerEstimateDoc";

export default function EstimateView() {
  const { token } = useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
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

  const sign = useMutation({
    mutationFn: (payload) => base44.functions.invoke("approvePublicEstimate", { token, ...payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estimate-public", token] }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!data?.document) {
    return <div className="min-h-screen bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">Estimate not found.</div>;
  }

  const doc = { ...data.document, agreement_text: data.document.agreement_text || data.contract_text || "" };
  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <CustomerEstimateDoc
        doc={doc}
        onSign={(p) => sign.mutate(p)}
        pending={sign.isPending}
        error={sign.error ? sign.error?.response?.data?.error || "Could not save your signature. Please try again." : null}
      />
    </div>
  );
}