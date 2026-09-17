import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function QboItemMappingTable({ connected }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["serviceCatalog", user?.organization_id],
    queryFn: () => base44.entities.ServiceCatalog.filter({ organization_id: user.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: qboItems = [], isLoading: loadingItems, error: itemsError } = useQuery({
    queryKey: ["qboItems"],
    queryFn: async () => {
      const res = await base44.functions.invoke("qboFetchItems", {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.items || [];
    },
    enabled: !!connected,
  });

  const setMapping = useMutation({
    mutationFn: async ({ serviceId, item }) =>
      base44.entities.ServiceCatalog.update(serviceId, {
        qbo_item_id: item?.id || null,
        qbo_item_name: item?.name || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries(["serviceCatalog"]);
      toast.success("Mapping saved");
    },
    onError: (e) => toast.error(e?.message || "Could not save mapping"),
  });

  const active = services.filter((s) => s.is_active !== false);
  const unmappedCount = active.filter((s) => !s.qbo_item_id).length;

  if (!connected) {
    return <p className="text-xs text-muted-foreground">Connect QuickBooks to map your service items.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-semibold text-sm">Service Item Mapping</h4>
          <p className="text-xs text-muted-foreground">
            Each FabTrack service item must point to a QuickBooks product/service before its invoices can sync.
          </p>
        </div>
        {unmappedCount > 0 ? (
          <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200">
            <AlertTriangle className="w-3 h-3" />{unmappedCount} unmapped
          </Badge>
        ) : (
          <Badge className="gap-1 bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3" />All mapped
          </Badge>
        )}
      </div>

      {itemsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
          Could not load QuickBooks products/services: {itemsError.message}
        </div>
      )}

      {(loadingServices || loadingItems) && <p className="text-xs text-muted-foreground">Loading…</p>}

      {!loadingServices && active.length === 0 && (
        <p className="text-xs text-muted-foreground">No active service catalog items yet.</p>
      )}

      <div className="divide-y border rounded-xl overflow-hidden">
        {active.map((svc) => (
          <div key={svc.id} className="flex items-center gap-3 px-3 py-2 bg-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{svc.name}</p>
              {svc.category && <p className="text-xs text-muted-foreground truncate">{svc.category}</p>}
            </div>
            {!svc.qbo_item_id && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            <Select
              value={svc.qbo_item_id || "__none__"}
              onValueChange={(v) =>
                setMapping.mutate({
                  serviceId: svc.id,
                  item: v === "__none__" ? null : qboItems.find((i) => i.id === v),
                })
              }
            >
              <SelectTrigger className="h-8 text-xs w-[240px] shrink-0">
                <SelectValue placeholder="Select QuickBooks item…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs text-muted-foreground">Not mapped</SelectItem>
                {qboItems.map((i) => (
                  <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}