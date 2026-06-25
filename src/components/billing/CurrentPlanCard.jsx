import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BILLING_PLANS } from './billingPlans';
import { format } from 'date-fns';
import { differenceInCalendarDays } from 'date-fns';

export default function CurrentPlanCard({ billing, isLoading }) {
  if (isLoading || !billing) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  const org = billing?.org || {};
  const sub = billing?.subscription;
  const currentPlan = org?.plan || 'trial';
  const currentStatus = org?.subscription_status || 'trial';
  const planDisplay = BILLING_PLANS.find((p) => p.key === currentPlan);

  // Trial days remaining — use subscription_period_end or a 14-day trial from org creation
  let trialDaysLeft = null;
  if (currentStatus === 'trial' || currentPlan === 'trial') {
    if (org?.subscription_period_end) {
      trialDaysLeft = Math.max(0, differenceInCalendarDays(new Date(org.subscription_period_end), new Date()));
    }
  }

  const statusBadge = {
    trial: { label: 'Trial', variant: 'secondary' },
    active: { label: 'Active', variant: 'default' },
    past_due: { label: 'Past Due', variant: 'destructive' },
    suspended: { label: 'Suspended', variant: 'destructive' },
  };
  const badge = statusBadge[currentStatus] || statusBadge.trial;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header band */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-5 border-b bg-muted/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold tracking-tight">
                {planDisplay?.name || currentPlan}
              </h2>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {planDisplay?.tagline || 'Your current subscription plan'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Plan price</p>
            <p className="text-lg font-semibold">
              {planDisplay?.priceLabel || '—'}
            </p>
          </div>
        </div>

        {/* Trial countdown */}
        {trialDaysLeft !== null && (
          <div className="px-6 py-4 border-b bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Your trial {trialDaysLeft <= 0 ? 'has ended' : `ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {trialDaysLeft <= 0
                    ? 'Choose a plan to keep your shop running.'
                    : 'Pick a plan that fits your shop — no interruption when you upgrade.'}
                </p>
              </div>
              <Link
                to="/billing"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade now
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* What's included */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <InfoRow
              icon={Users}
              label="Users"
              value={planDisplay?.userLimit || '—'}
            />
            <InfoRow
              icon={Calendar}
              label="Billing cycle"
              value={currentStatus === 'trial' ? 'Trial (no charge)' : 'Monthly'}
            />
            <InfoRow
              icon={Calendar}
              label="Next renewal"
              value={
                sub?.current_period_end
                  ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                  : currentStatus === 'trial'
                    ? '—'
                    : '—'
              }
            />
          </div>

          {/* Plan features list */}
          {planDisplay && (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                What's included
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {planDisplay.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}