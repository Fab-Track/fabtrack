import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getUserRoles } from '@/lib/roleHelpers';

/**
 * Auto-redirects org owners/admins to /setup if they haven't completed
 * the onboarding wizard. Also prevents accessing /setup when not needed.
 */
export default function OnboardingGate({ children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState('checking'); // 'checking' | 'needed' | 'not_needed'

  const isOnSetupPage = location.pathname === '/setup';

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setStatus('not_needed');
      return;
    }

    const roles = getUserRoles(user);
    const isOwnerOrAdmin = roles.includes('owner') || roles.includes('admin');

    // Self-serve, cold-start signup: no org and no assigned role at all.
    // By this point linkPendingInvite has already been awaited in AuthContext,
    // so a missing organization_id here means there really is no invite —
    // send them to the Shop Setup wizard regardless of role.
    if (!user.organization_id && !isOwnerOrAdmin && roles.length === 0) {
      setStatus('needed');
      return;
    }

    if (!isOwnerOrAdmin) {
      // Non-owner/admin: redirect away from /setup, otherwise let through
      setStatus(isOnSetupPage ? 'done' : 'skip');
      return;
    }

    let cancelled = false;
    setStatus('checking');

    base44.functions
      .invoke('checkOnboardingStatus')
      .then((res) => {
        if (cancelled) return;
        setStatus(res.data?.needs_onboarding ? 'needed' : 'done');
      })
      .catch(() => {
        if (!cancelled) setStatus('done');
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, user, isOnSetupPage]);

  if (status === 'checking') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Needs onboarding → redirect to /setup (unless already there)
  if (status === 'needed' && !isOnSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  // Already onboarded (or not eligible) but sitting on /setup → send to /dashboard
  if (status === 'done' && isOnSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}