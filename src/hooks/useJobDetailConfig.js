import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { JOB_DETAIL_DEFAULTS } from "@/lib/jobDetailDefaults";

/**
 * Fetches the org's JobDetailConfig (option lists for the Details tab).
 * Falls back to JOB_DETAIL_DEFAULTS for any missing or empty list.
 * Returns { config, configId, isLoading }.
 */
export function useJobDetailConfig() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const qc = useQueryClient();

  const { data: rawConfig, isLoading } = useQuery({
    queryKey: ["jobDetailConfig", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const results = await base44.entities.JobDetailConfig.filter({ organization_id: orgId });
      return results[0] || null;
    },
    enabled: !!orgId,
  });

  const config = {
    products: rawConfig?.products?.length ? rawConfig.products : JOB_DETAIL_DEFAULTS.products,
    railing_styles: rawConfig?.railing_styles?.length ? rawConfig.railing_styles : JOB_DETAIL_DEFAULTS.railing_styles,
    powdercoat_colors: rawConfig?.powdercoat_colors?.length ? rawConfig.powdercoat_colors : JOB_DETAIL_DEFAULTS.powdercoat_colors,
    stair_styles: rawConfig?.stair_styles?.length ? rawConfig.stair_styles : JOB_DETAIL_DEFAULTS.stair_styles,
    stair_materials: rawConfig?.stair_materials?.length ? rawConfig.stair_materials : JOB_DETAIL_DEFAULTS.stair_materials,
    stair_tread_materials: rawConfig?.stair_tread_materials?.length ? rawConfig.stair_tread_materials : JOB_DETAIL_DEFAULTS.stair_tread_materials,
    surfaces: rawConfig?.surfaces?.length ? rawConfig.surfaces : JOB_DETAIL_DEFAULTS.surfaces,
  };

  return { config, configId: rawConfig?.id || null, isLoading, qc };
}