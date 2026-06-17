import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  CreditCard, Calendar, ExternalLink, ArrowUpCircle,
  Users, Receipt, Loader2, CheckCircle, AlertTriangle,
  Ban, Clock, DollarSign,
} from 'lucide-react';
import { PLANS } from '@/lib/plans';

export default function BillingSection() {
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['org-billing', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getOrgBilling', {});
      return res.data;
    },
    enabled: !!user?.organization_id,
  });

  const handleSubscribe = async (plan) => {
    setCheckoutLoading(true);
    try {
      const res = await base44.functions.invoke('createSubscriptionCheckout', { plan });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.error(res.data?.error || 'Could not create checkout');
      }
    } catch (err) {
      toast.error('Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke('createBillingPortalSession', {});
      if (res.data?.portal_url) {
        window.location.href = res.data.portal_url;
      } else {
        if (res.data?.needs_subscription) {
          toast.error('No billing account yet. Subscribe to a plan first.');
        } else {
          toast.error(res.data?.error || 'Could not open billing portal');
        }
      }
    } catch (err) {
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const statusInfo = {
    trial: { label: 'Trial', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
    active: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
    past_due: { label: 'Past Due', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
    suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700 border-red-200', icon: Ban },
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-xl">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const billing = data;
  const org = billing?.org;
  const sub = billing?.subscription;
  const paymentMethod = billing?.payment_method;
  const invoices = billing?.invoices || [];
  const currentPlan = org?.plan || 'trial';
  const currentStatus = org?.subscription_status || 'trial';
  const status = statusInfo[currentStatus] || statusInfo.trial;

  // Calculate billing breakdown from subscription items
  let baseFee = null;
  let perUserFee = null;
  let totalMonthly = null;
  if (sub?.items) {
    const licensed = sub.items.find((i) => i.usage_type === 'licensed');
    const metered = sub.items.find((i) => i.usage_type === 'metered');
    baseFee = licensed ? { amount: licensed.unit_amount, qty: licensed.quantity } : null;
    perUserFee = metered ? { amount: metered.unit_amount } : null;
    totalMonthly = sub.items.reduce((sum, i) => {
      const qty = i.usage_type === 'metered' ? (org?.userCount || 0) : (i.quantity || 0);
      return sum + ((i.unit_amount || 0) * qty);
    }, 0);
  }

  const planCfg = PLANS[currentPlan];
  const upgradeTiers = ['starter', 'professional', 'enterprise'].filter(
    (t) => t !== currentPlan && t !== 'trial'
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="font-semibold text-base">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground">Manage your FabTrack plan and payment method.</p>
      </div>

      {/* Current plan & status */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Current Plan</p>
              <p className="font-semibold text-lg capitalize">
                {planCfg?.displayName || currentPlan}
              </p>
            </div>
            <Badge className={status.color}>
              <status.icon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          {/* Billing breakdown */}
          {sub && baseFee && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {planCfg?.displayName || currentPlan} base fee
                </span>
                <span className="font-medium">
                  ${baseFee.amount?.toFixed(2)}/mo
                </span>
              </div>
              {perUserFee && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    <Users className="w-3.5 h-3.5 inline mr-1" />
                    Per-user ({org?.userCount || 0} active users × ${perUserFee.amount?.toFixed(2)})
                  </span>
                  <span className="font-medium">
                    ${((perUserFee.amount || 0) * (org?.userCount || 0)).toFixed(2)}/mo
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Estimated monthly total</span>
                <span>${totalMonthly?.toFixed(2) || '—'}</span>
              </div>
            </div>
          )}

          {/* Stripe not connected yet */}
          {!billing?.has_stripe_customer && (
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">
                No billing account linked. {currentPlan === 'trial'
                  ? 'Choose a plan below to start your subscription.'
                  : 'Your plan is set but needs a Stripe billing account.'}
              </p>
            </div>
          )}

          {/* Next billing date */}
          {sub && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {sub.current_period_end
                  ? `Next billing: ${format(new Date(sub.current_period_end), 'MMM d, yyyy')}`
                  : sub.cancel_at_period_end ? 'Cancels at period end' : ''}
              </span>
            </div>
          )}

          {/* Payment method */}
          {paymentMethod && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span className="capitalize">{paymentMethod.brand} ending in •••• {paymentMethod.last4}</span>
              <span className="text-xs">
                Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {billing?.has_stripe_customer && (
              <Button variant="outline" onClick={handlePortal} disabled={portalLoading} className="gap-1.5">
                {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Manage Payment & Invoices
              </Button>
            )}
            {!billing?.has_stripe_customer && upgradeTiers.length > 0 && (
              upgradeTiers.map((tier) => (
                <Button
                  key={tier}
                  variant={tier === 'professional' ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(tier)}
                  disabled={checkoutLoading}
                  className="gap-1.5 capitalize"
                >
                  {checkoutLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                  )}
                  Subscribe to {PLANS[tier]?.displayName || tier}
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.slice(0, 6).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm py-1.5">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    {inv.period_start
                      ? format(new Date(inv.period_start), 'MMM d') + ' – ' + format(new Date(inv.period_end), 'MMM d, yyyy')
                      : `Invoice ${inv.number || inv.id.slice(-8)}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${inv.amount_paid?.toFixed(2)}</span>
                  {inv.hosted_url && (
                    <a
                      href={inv.hosted_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}