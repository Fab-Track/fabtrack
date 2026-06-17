import { useAuth } from '@/lib/AuthContext';

/**
 * Returns the current user's organization_id.
 * Returns null for super_admins (they see all orgs).
 */
export function useOrgId() {
  const { user } = useAuth();
  if (!user) return null;
  // Super admins have no org scope
  if ((user.roles || []).includes('super_admin')) return null;
  return user.organization_id || null;
}

/**
 * Returns whether the current user is a super admin.
 */
export function useIsSuperAdmin() {
  const { user } = useAuth();
  return (user?.roles || []).includes('super_admin');
}

/**
 * Merges organization_id into a filter object.
 * If orgId is null (super admin), returns filters unchanged.
 * Always returns a new object — never mutates the input.
 */
export function withOrgFilter(filters, orgId) {
  if (!orgId) return { ...filters };
  return { ...filters, organization_id: orgId };
}