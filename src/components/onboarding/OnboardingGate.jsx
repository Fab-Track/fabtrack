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
    if (!isOwnerOrAdmin) {
      setStatus('not_needed');
      return;
    }

    // If already on /setup, let the page handle its own check
    if (isOnSetupPage) {
      setStatus('not_needed');
      return;
    }

    let cancelled = false;
    setStatus('checking');

    base44.functions
      .invoke('checkOnboardingStatus')
      .then((res) => {
        if (cancelled) return;
        setStatus(res.data?.needs_onboarding ? 'needed' : 'not_needed');
      })
      .catch(() => {
        if (!cancelled) setStatus('not_needed');
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

  if (status === 'needed' && !isOnSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}