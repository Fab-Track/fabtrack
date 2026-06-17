import { useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserCap } from '@/lib/plans';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Check whether the current org is approaching or at its user cap.
 *
 * Returns:
 *   userCount    — current active user count
 *   userCap      — max allowed users (null = unlimited)
 *   atCap        — true if userCount >= userCap
 *   nearCap      — true if within 1 of cap
 *   remaining    — slots left (null if unlimited)
 */
export function useUserCapCheck() {
  const { user } = useAuth();

  const plan = user?.organization_plan || 'trial';
  const orgId = user?.organization_id;
  const userCap = getUserCap(plan);

  // Fetch the latest user count
  const { data: userCount } = useQuery({
    queryKey: ['org-user-count', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const org = await base44.entities.Organization.get(orgId);
      return org?.active_user_count || 0;
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  return useMemo(() => {
    const count = userCount ?? 0;
    const atCap = userCap !== null && count >= userCap;
    const nearCap = userCap !== null && count >= userCap - 1 && count < userCap;
    const remaining = userCap !== null ? Math.max(0, userCap - count) : null;

    return {
      userCount: count,
      userCap,
      atCap,
      nearCap,
      remaining,
    };
  }, [userCount, userCap]);
}