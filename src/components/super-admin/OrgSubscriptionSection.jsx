import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Loader2, AlertTriangle, CheckCircle, Clock, Ban, Play,
  Calendar, Users, DollarSign, CreditCard, ExternalLink,
} from 'lucide-react';

const STATUS_INFO = {
  trial: { label: 'Trial', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, desc: 'Access is active. Trial period in effect.' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, desc: 'Full access. Subscription is current.' },
  past_due: { label: 'Past Due', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle, desc: 'Access is still active but payment is past due.' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700 border-red-200', icon: Ban, desc: 'Access is blocked. Users see "subscription inactive" message.' },
};

export default function OrgSubscriptionSection({ org }) {
  const queryClient = useQueryClient();
  const currentStatus = org.subscription_status || 'trial';

  // Fetch real Stripe billing data
  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ['super-admin', 'org-billing', org.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getOrgBilling', { organizationId: org.id });
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateOrganization', data),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success('Subscription status updated (manual override)');
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-detail', org.id] });
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-billing', org.id] });
      } else {
        toast.error(res.data?.error || 'Update failed');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Update failed');
    },
  });

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ organizationId: org.id, subscriptionStatus: newStatus });
  };

  const handlePlanChange = (newPlan) => {
    updateMutation.mutate({ organizationId: org.id, plan: newPlan });
  };

  const currentInfo = STATUS_INFO[currentStatus] || STATUS_INFO.trial;
  const sub = billing?.subscription;
  const paymentMethod = billing?.payment_method;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <currentInfo.icon className="w-5 h-5" />
          Subscription &amp; Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stripe Billing Summary (synced live) */}
        <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Stripe Billing Data (Live Sync)
          </h4>

          {billingLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : !billing?.has_stripe_customer ? (
            <p className="text-sm text-muted-foreground">
              No Stripe billing account linked. This org is managed manually.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Subscription status from Stripe */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Stripe status:</span>
                <Badge className={STATUS_INFO[sub?.status]?.color || 'bg-slate-100'}>
                  {sub?.status || '—'}
                </Badge>
              </div>

              {/* Billing period */}
              {sub?.current_period_end && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  Next billing: {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                </div>
              )}

              {/* MRR breakdown */}
              {sub?.items && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {sub.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-muted-foreground text-xs">
                        {item.usage_type === 'metered' ? (
                          <><Users className="w-3 h-3 inline mr-1" />Per-user</>
                        ) : 'Base fee'}
                      </span>
                      <span className="font-medium text-xs">
                        ${item.unit_amount?.toFixed(2)}/{item.recurring_interval || 'mo'}
                        {item.usage_type === 'metered' && ` × ${org.active_user_count || 0} users`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment method */}
              {paymentMethod && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="w-3 h-3" />
                  <span className="capitalize">{paymentMethod.brand} •••• {paymentMethod.last4}</span>
                </div>
              )}

              {/* Subscription ID link */}
              {sub?.id && (
                <a
                  href={`https://dashboard.stripe.com/test/subscriptions/${sub.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> View in Stripe
                </a>
              )}
            </div>
          )}
        </div>

        {/* Plan Tier */}
        <div>
          <h4 className="text-sm font-medium mb-3">Plan Tier (Manual)</h4>
          <div className="flex flex-wrap gap-2">
            {['trial', 'starter', 'professional', 'enterprise'].map((plan) => (
              <Button
                key={plan}
                variant={org.plan === plan ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePlanChange(plan)}
                disabled={updateMutation.isPending}
                className="capitalize"
              >
                {plan}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Status Actions */}
        <div>
          <h4 className="text-sm font-medium mb-3">
            Subscription Status
            {billing?.has_stripe_customer && (
              <span className="text-xs text-amber-600 ml-2 font-normal">
                (Manual override — Stripe webhooks are primary)
              </span>
            )}
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={currentStatus === 'trial' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange('trial')}
              disabled={updateMutation.isPending}
            >
              <Clock className="w-4 h-4 mr-1" /> Trial
            </Button>
            <Button
              variant={currentStatus === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange('active')}
              disabled={updateMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Active
            </Button>
            <Button
              variant={currentStatus === 'past_due' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange('past_due')}
              disabled={updateMutation.isPending}
              className="text-amber-700 border-amber-300"
            >
              <AlertTriangle className="w-4 h-4 mr-1" /> Past Due
            </Button>
            <Button
              variant={currentStatus === 'suspended' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange('suspended')}
              disabled={updateMutation.isPending}
            >
              <Ban className="w-4 h-4 mr-1" /> Suspend
            </Button>
          </div>
        </div>

        {/* Reactivate if suspended */}
        {currentStatus === 'suspended' && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <p className="text-sm text-red-800 mb-3">
              This organization is suspended. Its users cannot access the app.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleStatusChange('active')}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              Reactivate Organization
            </Button>
          </div>
        )}

        {updateMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Updating...
          </div>
        )}
      </CardContent>
    </Card>
  );
}