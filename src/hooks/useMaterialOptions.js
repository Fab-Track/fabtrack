import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * Fetches all active MaterialPriceList records for the org.
 * Returns { materials, isLoading }. Callers filter by product type
 * (component_type array includes the product type name).
 */
export function useMaterialOptions() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const { data: materials, isLoading } = useQuery({
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

  return { materials: materials || [], isLoading };
}