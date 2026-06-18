import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';

// Keys for session-storage-based super admin impersonation
const IMPERSONATION_KEY = 'super_impersonate_org_id';

/**
 * Returns the effective organization_id for data scoping.
 * - Normal users: returns their organization_id
 * - Super admins not impersonating: returns null (sees all orgs)
 * - Super admins impersonating: returns the impersonated org_id
 */
export function useOrgId() {
  const { user } = useAuth();
  const [impersonationId, setImpersonationId] = useState(
    () => sessionStorage.getItem(IMPERSONATION_KEY)
  );

  useEffect(() => {
    const handleStorage = () => setImpersonationId(sessionStorage.getItem(IMPERSONATION_KEY));
    window.addEventListener('storage', handleStorage);
    // Also poll since storage events don't fire in same tab
    const interval = setInterval(() => {
      const current = sessionStorage.getItem(IMPERSONATION_KEY);
      if (current !== impersonationId) setImpersonationId(current);
    }, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [impersonationId]);

  if (!user) return null;

  // Super admin impersonating an org
  if ((user.roles || []).includes('super_admin') && impersonationId) {
    return impersonationId;
  }

  // Super admins have no org scope (unless impersonating)
  if ((user.roles || []).includes('super_admin')) return null;

  return user.organization_id || null;
}

/**
 * Returns the organization_id to stamp onto NEW records.
 * - Impersonating super admin: the impersonated org_id
 * - Normal user: their organization_id
 * - Super admin who also belongs to an org: their organization_id (so they can use the app)
 * Falls back to user.organization_id when there's no active org scope.
 * Usage: const writeOrgId = useWriteOrgId();
 *        base44.entities.Customer.create({ ...data, organization_id: writeOrgId })
 */
export function useWriteOrgId() {
  const { user } = useAuth();
  const orgId = useOrgId();
  return orgId || user?.organization_id || null;
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

/**
 * Hook that returns a filter-ready object with organization_id.
 * Returns { organization_id: '...' } for org-scoped users or impersonating super admins,
 * or {} for super admins not impersonating (they see all orgs).
 * Usage: const orgFilter = useOrgFilter();
 *        base44.entities.Job.filter({ ...orgFilter, status: 'active' })
 */
export function useOrgFilter() {
  const orgId = useOrgId();
  if (!orgId) return {};
  return { organization_id: orgId };
}