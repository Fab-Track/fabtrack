import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/** Maps each material field label to the component_type slot it filters on. */
export const MATERIAL_SLOT_MAP = {
  "Top Rail": "Top Rail",
  "Bottom Rail": "Bottom Rail",
  "Post": "Post",
  "Pickets": "Picket",
  "Base Plate Size": "Base Plate",
};

/**
 * Fetches all active MaterialPriceList records for the org and groups
 * their names by component_type slot. Returns { optionsBySlot, isLoading }.
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

  const optionsBySlot = useMemo(() => {
    const map = {};
    const items = materials || [];
    const allSlots = [...new Set(Object.values(MATERIAL_SLOT_MAP))];
    allSlots.forEach(slot => {
      map[slot] = items
        .filter(m => Array.isArray(m.component_type) && m.component_type.includes(slot))
        .map(m => m.name);
    });
    return map;
  }, [materials]);

  return { optionsBySlot, isLoading };
}