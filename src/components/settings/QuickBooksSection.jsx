import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, CheckCircle2, Circle, RefreshCw, ExternalLink } from "lucide-react";
import QboItemMappingTable from "./QboItemMappingTable";

export default function QuickBooksSection() {
  const { data: status, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["qboStatus"],
    queryFn: async () => {
      const res = await base44.functions.invoke("qboGetStatus", {});
      return res.data || {};
    },
  });

  const connected = !!status?.connected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">QuickBooks Online</h3>
            <p className="text-xs text-muted-foreground">Push invoices to QBO and pull payment status back automatically</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Badge variant="outline" className="text-muted-foreground">Checking…</Badge>
          ) : connected ? (
            <Badge className="gap-1 bg-green-100 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3" />Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Circle className="w-3 h-3" />Not Connected
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />Check
          </Button>
        </div>
      </div>

      {connected ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-muted/40 rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">QuickBooks Company</p>
            <p className="text-sm font-semibold">{status.company_name || "—"}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Realm {status.realm_id}</p>
          </div>
          <div className="bg-muted/40 rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">Last payment check</p>
            <p className="text-sm font-semibold">
              {status.last_poll_at ? new Date(status.last_poll_at).toLocaleString() : "Not run yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Payments are checked every 15 minutes</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
          QuickBooks isn't connected right now. {status?.error ? `(${status.error}) ` : ""}
          Ask in the builder chat to reconnect QuickBooks, then press Check.
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
        <strong>How payments work:</strong> once an invoice is synced, email it from QuickBooks so the customer gets the
        "Pay Now" link. FabTrack checks QuickBooks every 15 minutes and updates the invoice's paid amount and status.
        <a href="https://qbo.intuit.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-1 underline">
          Open QuickBooks <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Separator />

      <QboItemMappingTable connected={connected} />
    </div>
  );
}