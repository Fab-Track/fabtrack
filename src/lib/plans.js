/**
 * FabTrack Platform Billing — Plan Configuration
 *
 * All prices, user caps, Stripe IDs, and feature lists are CONFIGURABLE here.
 * Update this file + your Stripe Dashboard to adjust pricing without a rebuild.
 *
 * Stripe Price IDs are PLACEHOLDERS — replace with real IDs from your
 * Stripe dashboard (test mode: price_test_xxx, live mode: price_xxx).
 */

export const PLANS = {
  trial: {
    displayName: 'Trial',
    description: 'Time-limited full access before choosing a paid tier.',
    userCap: 5,
    basePriceId: null,           // no charge — trial
    meteredPriceId: null,        // no charge — trial
    features: [
      'job_board',
      'customers',
      'estimates',
      'invoicing',
      'scheduling',
      'attachments',
      'messages',
      'mobile_access',
      'time_tracking',
      'payroll',
      'reports',
      'service_catalog',
      'change_orders',
      'shop_floor',
      'job_costing',
      'craftsman_score',
      'google_calendar_sync',
      'multi_role_access',
    ],
  },

  starter: {
    displayName: 'Starter',
    description: 'Core job management for small shops.',
    userCap: 5,
    basePriceId: 'price_1TjQRsArEccErEMJWCLMtjee',        // $250/mo base
    meteredPriceId: 'price_1TjQRsArEccErEMJkqgjlnjQ',      // $15/user/mo metered
    features: [
      'job_board',
      'customers',
      'estimates',
      'invoicing',
      'scheduling',
      'attachments',
      'messages',
      'mobile_access',
    ],
  },

  professional: {
    displayName: 'Professional',
    description: 'Full shop management with time tracking, reports, and costing.',
    userCap: 20,
    basePriceId: 'price_1TjQT3ArEccErEMJQKHdAAMp',          // $350/mo base
    meteredPriceId: 'price_1TjQTYArEccErEMJclhK5ZO4',       // $15/user/mo metered
    features: [
      'job_board',
      'customers',
      'estimates',
      'invoicing',
      'scheduling',
      'attachments',
      'messages',
      'mobile_access',
      'time_tracking',
      'payroll',
      'reports',
      'service_catalog',
      'change_orders',
      'shop_floor',
      'job_costing',
      'craftsman_score',
      'google_calendar_sync',
      'multi_role_access',
    ],
  },

  enterprise: {
    displayName: 'Enterprise',
    description: 'Unlimited users with advanced integrations, branding, and priority support.',
    userCap: 999,
    basePriceId: 'price_1TjQULArEccErEMJWo6OCaQD',          // $500/mo base
    meteredPriceId: 'price_1TjQUhArEccErEMJyA5p4Rfr',       // $15/user/mo metered
    features: [
      'job_board',
      'customers',
      'estimates',
      'invoicing',
      'scheduling',
      'attachments',
      'messages',
      'mobile_access',
      'time_tracking',
      'payroll',
      'reports',
      'service_catalog',
      'change_orders',
      'shop_floor',
      'job_costing',
      'craftsman_score',
      'google_calendar_sync',
      'multi_role_access',
      'advanced_roles',
      'advanced_integrations',
      'custom_branding',
      'priority_support',
    ],
  },
};

/** Quick lookup: does this plan have a given feature? */
export function planHasFeature(plan, featureKey) {
  const cfg = PLANS[plan];
  if (!cfg) return false;
  return cfg.features.includes(featureKey);
}

/** Get the user cap for a plan (null = unlimited). */
export function getUserCap(plan) {
  const cfg = PLANS[plan];
  if (!cfg) return null;
  return cfg.userCap;
}

/** All feature keys used across tiers (for validation). */
export const ALL_FEATURE_KEYS = [...new Set(
  Object.values(PLANS).flatMap((p) => p.features)
)];