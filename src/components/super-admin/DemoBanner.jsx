import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isSuperAdminImpersonating, getImpersonatedOrgId } from '@/components/super-admin/SuperAdminBanner';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DemoBanner() {
  const { user } = useAuth();
  const impersonatedOrgId = getImpersonatedOrgId();

  // Only check if super admin is impersonating an org
  const isImpersonating = isSuperAdminImpersonating();

  const { data: org } = useQuery({
    queryKey: ['demo-org-check', impersonatedOrgId],
    queryFn: async () => {
      if (!impersonatedOrgId) return null;
      const res = await base44.functions.invoke('listOrganizations', {});
      return res.data?.organizations?.find((o) => o.id === impersonatedOrgId) || null;
    },
    enabled: isImpersonating && !!impersonatedOrgId,
  });

  if (!isImpersonating || !org?.is_demo) return null;

  return (
    <div className="sticky top-0 z-40 bg-amber-400 text-amber-950 border-b border-amber-500/30">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">
            This is a demo environment. Data resets every 7 days.
          </span>
        </div>
        <Link
          to="/register"
          className="flex items-center gap-1.5 text-sm font-semibold bg-amber-950 text-amber-50 px-3 py-1 rounded-md hover:bg-amber-900 transition-colors"
        >
          Ready to get started? Create your real account
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}