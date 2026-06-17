import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, Building2, X } from 'lucide-react';

// Keys for session storage
const IMPERSONATION_KEY = 'super_impersonate_org_id';
const IMPERSONATION_NAME_KEY = 'super_impersonate_org_name';

/**
 * Start impersonating an organization.
 * Call this from the SuperAdmin page, then navigate to the main app.
 */
export function startOrgImpersonation(orgId, orgName) {
  sessionStorage.setItem(IMPERSONATION_KEY, orgId);
  sessionStorage.setItem(IMPERSONATION_NAME_KEY, orgName);
}

/**
 * Get the currently impersonated org ID (if any).
 */
export function getImpersonatedOrgId() {
  return sessionStorage.getItem(IMPERSONATION_KEY);
}

/**
 * Get the currently impersonated org name (if any).
 */
export function getImpersonatedOrgName() {
  return sessionStorage.getItem(IMPERSONATION_NAME_KEY);
}

/**
 * Check if a super admin is currently impersonating an org.
 */
export function isSuperAdminImpersonating() {
  return !!sessionStorage.getItem(IMPERSONATION_KEY);
}

/**
 * End impersonation and redirect to super admin.
 */
export function exitOrgImpersonation() {
  sessionStorage.removeItem(IMPERSONATION_KEY);
  sessionStorage.removeItem(IMPERSONATION_NAME_KEY);
  window.location.href = '/super-admin';
}

/**
 * Banner shown at the top of the main app when super admin is impersonating an org.
 */
export default function SuperAdminBanner() {
  const navigate = useNavigate();
  const orgId = getImpersonatedOrgId();
  const orgName = getImpersonatedOrgName();

  if (!orgId) return null;

  const handleExit = async () => {
    // Log the impersonation end
    await base44.entities.SuperAdminAuditLog.create({
      admin_email: '',
      admin_name: 'Super Admin',
      action_type: 'impersonation_ended',
      organization_id: orgId,
      organization_name: orgName,
      action_detail: `Ended viewing "${orgName}" super admin support session`,
    }).catch(() => {});

    exitOrgImpersonation();
  };

  return (
    <div className="sticky top-0 z-50 bg-indigo-600 text-white">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">
            Viewing as <strong>{orgName}</strong> — Super Admin support session
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="text-white hover:bg-indigo-700 h-7 text-xs"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Exit Support Session
        </Button>
      </div>
    </div>
  );
}