import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * Fetches all active MaterialPriceList records and CostCode records for the org.
 * Returns { materials, costCodes, isLoading }.
 * Callers filter materials by matching the product type name to a CostCode name (exact 1:1),
 * then checking which materials have that cost code ID in their cost_code_ids.
 */
export function useMaterialOptions() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const { data: materials, isLoading: matLoading } = useQuery({
    queryKey: ["materialOptions", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const page = await base44.entities.MaterialPriceList.filter(
        { active: true },
        { limit: 500, sort: "name" }
      );
      return page.items || [];
    },
    enabled: !!orgId,
  });

  const { data: costCodes, isLoading: codesLoading } = useQuery({
    queryKey: ["costCodesForMaterials", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const page = await base44.entities.CostCode.filter(
        { organization_id: orgId, active: { $ne: false } },
        { sort: "name", limit: 500 }
      );
      return page.items || [];
    },
    enabled: !!orgId,
  });

  return {
    materials: materials || [],
    costCodes: costCodes || [],
    isLoading: matLoading || codesLoading,
  };
}