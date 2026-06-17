import { useAuth } from '@/lib/AuthContext';
import { planHasFeature, getUserCap } from '@/lib/plans';
import { FEATURE_GATES } from '@/lib/featureGates';

/**
 * Check whether the current user's organization has access to a feature.
 *
 * Usage:
 *   const { hasAccess, lockedMessage, upgradeTo } = useFeatureGate('reports');
 *
 * Returns null (hasAccess=true, no gate info) if the feature is available,
 * or gate info if the org's plan doesn't include it.
 */
export function useFeatureGate(featureKey) {
  const { user } = useAuth();

  if (!user) {
    return { hasAccess: false, lockedMessage: 'Sign in required.', upgradeTo: null };
  }

  const plan = user.organization_plan || 'trial';

  // Super admins get everything
  if ((user.roles || []).includes('super_admin')) {
    return { hasAccess: true, plan, userCap: getUserCap(plan) };
  }

  const hasAccess = planHasFeature(plan, featureKey);
  const gate = FEATURE_GATES[featureKey];

  return {
    hasAccess,
    plan,
    userCap: getUserCap(plan),
    lockedMessage: gate?.lockedMessage || `This feature requires a higher plan tier.`,
    upgradeTo: gate?.upgradeTo || null,
    featureLabel: gate?.label || featureKey,
  };
}