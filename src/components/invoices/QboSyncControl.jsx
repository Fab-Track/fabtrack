import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { toast } from "sonner";

export default function QboSyncControl({ invoice, jobId }) {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [state, setState] = useState({
    status: invoice?.qbo_sync_status || "not_synced",
    docNumber: invoice?.qbo_doc_number || null,
    paymentStatus: invoice?.qbo_payment_status || null,
    error: invoice?.qbo_sync_error || null,
  });

  if (!invoice?.id) return null;

  async function handleSync() {
    setSyncing(true);
    const res = await base44.functions.invoke("qboSyncInvoice", { invoice_id: invoice.id });
    setSyncing(false);

    if (res.data?.ok) {
      setState({
        status: "synced",
        docNumber: res.data.qbo_doc_number,
        paymentStatus: res.data.qbo_payment_status,
        error: null,
      });
      toast.success(`Synced to QuickBooks${res.data.qbo_doc_number ? ` as ${res.data.qbo_doc_number}` : ""}`);
      qc.invalidateQueries(["invoices", jobId]);
    } else {
      const msg = res.data?.error || "Sync failed";
      setState((s) => ({ ...s, status: "error", error: msg }));
      toast.error(msg);
    }
  }

  const isSynced = state.status === "synced";
  const isError = state.status === "error";

  return (
    <div className="flex items-center gap-2">
      {isSynced ? (
        <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 text-xs">
          <CheckCircle2 className="w-3 h-3" />
          QBO{state.docNumber ? ` ${state.docNumber}` : ""}
        </Badge>
      ) : isError ? (
        <Badge className="gap-1 bg-red-100 text-red-700 border-red-200 text-xs" title={state.error || ""}>
          <AlertCircle className="w-3 h-3" />QBO error
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 text-muted-foreground text-xs">
          <Circle className="w-3 h-3" />Not in QBO
        </Badge>
      )}

      {isSynced && state.paymentStatus && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          QBO payment: {state.paymentStatus}
        </Badge>
      )}

      <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5">
        <BookOpen className="w-3.5 h-3.5" />
        {syncing ? "Syncing…" : isSynced ? "Re-sync" : "Sync to QBO"}
      </Button>
    </div>
  );
}