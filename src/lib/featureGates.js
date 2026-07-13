/**
 * Feature-to-Tier mapping for UI gating.
 *
 * Each entry maps a feature key → lock message and suggested upgrade tier.
 * Feature keys must match those defined in lib/plans.js.
 */

export const FEATURE_GATES = {
  time_tracking: {
    label: 'Time Tracking & Payroll',
    description: 'Track shop hours, manage payroll, and run time reports.',
    lockedMessage: 'Time Tracking & Payroll requires Professional or higher.',
    upgradeTo: 'professional',
    route: '/my-timesheet',
    settingsSection: 'payroll_settings',
  },
  payroll: {
    label: 'Payroll',
    description: 'Admin payroll processing and reporting.',
    lockedMessage: 'Payroll features require Professional or higher.',
    upgradeTo: 'professional',
    route: '/admin-payroll',
  },
  reports: {
    label: 'Reports',
    description: 'Full reporting suite including sales performance and analysis.',
    lockedMessage: 'Advanced Reports require Professional or higher.',
    upgradeTo: 'professional',
    route: '/reports',
  },
  service_catalog: {
    label: 'Service Catalog',
    description: 'Catalog with inline calculators for railings and stairs.',
    lockedMessage: 'Service Catalog & Calculators require Professional or higher.',
    upgradeTo: 'professional',
    settingsSection: 'catalog',
  },
  change_orders: {
    label: 'Change Orders',
    description: 'Create and manage change orders on active jobs.',
    lockedMessage: 'Change Orders require Professional or higher.',
    upgradeTo: 'professional',
  },
  shop_floor: {
    label: 'Shop Floor',
    description: 'Work centers and production management.',
    lockedMessage: 'Shop Floor features require Professional or higher.',
    upgradeTo: 'professional',
    route: '/work-centers',
  },
  job_costing: {
    label: 'Job Costing',
    description: 'Track material, labor, and overhead costs per job.',
    lockedMessage: 'Job Costing requires Professional or higher.',
    upgradeTo: 'professional',
  },
  craftsman_score: {
    label: 'Craftsman Score',
    description: 'Employee quality scoring and performance tracking.',
    lockedMessage: 'Craftsman Score requires Professional or higher.',
    upgradeTo: 'professional',
    route: '/craftsman',
  },
  google_calendar_sync: {
    label: 'Google Calendar Sync',
    description: 'Two-way sync with Google Calendar.',
    lockedMessage: 'Google Calendar Sync requires Professional or higher.',
    upgradeTo: 'professional',
    settingsSection: 'integrations',
  },
  multi_role_access: {
    label: 'Multi-Role Access',
    description: 'Assign multiple roles per user (e.g., estimator + fabricator).',
    lockedMessage: 'Multi-Role Access requires Professional or higher.',
    upgradeTo: 'professional',
  },
  advanced_roles: {
    label: 'Advanced Roles & Permissions',
    description: 'Custom role definitions and fine-grained permission matrix.',
    lockedMessage: 'Advanced Roles & Permissions require Enterprise.',
    upgradeTo: 'enterprise',
  },
  advanced_integrations: {
    label: 'Advanced Integrations',
    description: 'Premium third-party integrations and API access.',
    lockedMessage: 'Advanced Integrations require Enterprise.',
    upgradeTo: 'enterprise',
  },
  custom_branding: {
    label: 'Custom Branding',
    description: 'White-label the platform with your logo, colors, and domain.',
    lockedMessage: 'Custom Branding requires Enterprise.',
    upgradeTo: 'enterprise',
  },
  priority_support: {
    label: 'Priority Support',
    description: 'Dedicated support with faster response times.',
    lockedMessage: 'Priority Support requires Enterprise.',
    upgradeTo: 'enterprise',
  },
};