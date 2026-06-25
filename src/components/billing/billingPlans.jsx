/**
 * Display-level plan configuration for the Billing & Subscription page.
 * These are the marketing/presentation values shown to users.
 * Backend pricing (Stripe Price IDs) lives in lib/plans.js.
 */
export const BILLING_PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 49,
    priceLabel: '$49/mo',
    userLimit: 'Up to 3 users',
    tagline: 'Core job management for small shops',
    features: [
      'Up to 3 users',
      'Unlimited jobs',
      'Job costing and estimating',
      'Customer management',
      'Email support',
    ],
    highlight: false,
  },
  {
    key: 'professional',
    name: 'Professional',
    price: 99,
    priceLabel: '$99/mo',
    userLimit: 'Up to 10 users',
    tagline: 'Full shop management with time tracking and scheduling',
    features: [
      'Up to 10 users',
      'Everything in Starter',
      'Production scheduling board',
      'Shop floor time tracking',
      'File/document attachments per job',
      'Priority support',
    ],
    highlight: true,
    badge: 'Most popular',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Custom',
    userLimit: 'Unlimited users',
    tagline: 'Advanced integrations and dedicated support',
    features: [
      'Unlimited users',
      'Everything in Professional',
      'Multi-location support',
      'Custom integrations',
      'Dedicated onboarding',
      'SLA support',
    ],
    highlight: false,
  },
];

/** Tier order for comparison (lowest to highest). */
export const TIER_ORDER = ['trial', 'starter', 'professional', 'enterprise'];

/** Returns true if `planA` is a higher tier than `planB`. */
export function isHigherTier(planA, planB) {
  return TIER_ORDER.indexOf(planA) > TIER_ORDER.indexOf(planB);
}