import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { rows } from "@/lib/costGroups";

export default function useCostGroupData() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const qc = useQueryClient();
  const q = { organization_id: orgId };
  const opts = { enabled: !!orgId };

  const cats = useQuery({
    queryKey: ["cg", "categories", orgId],
    queryFn: async () => rows(await base44.entities.CatalogCategory.filter(q, { sort: "sort_order", limit: 500 })),
    ...opts,
  });
  const items = useQuery({
    queryKey: ["cg", "items", orgId],
    queryFn: async () => rows(await base44.entities.ServiceCatalog.filter(q, { sort: "sort_order", limit: 1000 })),
    ...opts,
  });
  const settings = useQuery({
    queryKey: ["cg", "settings", orgId],
    queryFn: async () => rows(await base44.entities.AppSettings.filter({ ...q, setting_key: "main" }, { limit: 1 }))[0] || null,
    ...opts,
  });
  const materials = useQuery({
    queryKey: ["cg", "materials", orgId],
    queryFn: async () => rows(await base44.entities.MaterialPriceList.filter(q, { limit: 1000 })),
    ...opts,
  });

  return {
    orgId,
    categories: cats.data || [],
    items: items.data || [],
    settings: settings.data || null,
    materials: materials.data || [],
    loading: cats.isLoading || items.isLoading || settings.isLoading || materials.isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: ["cg"] }),
  };
}