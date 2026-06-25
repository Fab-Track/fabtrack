import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import CurrentPlanCard from '@/components/billing/CurrentPlanCard';
import PlanComparison from '@/components/billing/PlanComparison';
import BillingHistoryTable from '@/components/billing/BillingHistoryTable';
import UpgradePlaceholderModal from '@/components/billing/UpgradePlaceholderModal';
import EnterpriseInquiryModal from '@/components/billing/EnterpriseInquiryModal';

export default function Billing() {
  const { user } = useAuth();
  const [upgradePlan, setUpgradePlan] = useState(null); // plan key for placeholder modal
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: billing, isLoading } = useQuery({
    queryKey: ['org-billing-page', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getOrgBilling', {});
      return res.data;
    },
    enabled: !!user?.organization_id,
  });

  const currentPlan = billing?.org?.plan || 'trial';
  const currentStatus = billing?.org?.subscription_status || 'trial';
  const isTrial = currentPlan === 'trial' || currentStatus === 'trial';

  const handleUpgrade = (planKey, planName) => {
    if (planKey === 'enterprise') {
      setEnterpriseOpen(true);
    } else {
      setUpgradePlan({ key: planKey, name: planName });
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke('createBillingPortalSession', {});
      if (res.data?.portal_url) {
        window.location.href = res.data.portal_url;
      } else {
        toast.error(res.data?.error || 'Could not open billing portal');
      }
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 md:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Billing & Subscription
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Manage your plan, payment method, and billing history
              </p>
            </div>
          </div>
          {billing?.has_stripe_customer && (
            <Button variant="outline" onClick={handlePortal} disabled={portalLoading} className="gap-1.5">
              {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
              Manage Payment & Invoices
            </Button>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-8">
        {/* Current plan */}
        <section>
          {isLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : (
            <CurrentPlanCard billing={billing} isLoading={isLoading} />
          )}
        </section>

        {/* Plan comparison */}
        <section>
          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          ) : (
            <PlanComparison
              currentPlan={currentPlan}
              isTrial={isTrial}
              onUpgrade={handleUpgrade}
            />
          )}
        </section>

        {/* Billing history */}
        <section>
          <BillingHistoryTable billing={billing} isLoading={isLoading} />
        </section>
      </main>

      {/* Upgrade placeholder modal (Starter/Professional) */}
      <UpgradePlaceholderModal
        open={!!upgradePlan}
        onOpenChange={(open) => !open && setUpgradePlan(null)}
        planName={upgradePlan?.name}
      />

      {/* Enterprise inquiry modal */}
      <EnterpriseInquiryModal
        open={enterpriseOpen}
        onOpenChange={setEnterpriseOpen}
      />
    </div>
  );
}