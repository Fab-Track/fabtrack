import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { BILLING_PLANS, isHigherTier } from './billingPlans';

export default function PlanComparison({ currentPlan, isTrial, onUpgrade }) {
  // On trial: highlight Professional as "Most popular"
  const displayPlans = BILLING_PLANS.map((p) => ({
    ...p,
    isCurrent: p.key === currentPlan && !isTrial,
    canUpgrade:
      isTrial ||
      (p.key !== currentPlan && isHigherTier(p.key, currentPlan)),
  }));

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Compare Plans</h3>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits your shop. Upgrade or downgrade anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {displayPlans.map((plan) => (
          <Card
            key={plan.key}
            className={`relative flex flex-col ${
              plan.highlight ? 'border-primary shadow-md ring-1 ring-primary/20' : ''
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  {plan.badge}
                </Badge>
              </div>
            )}
            <CardContent className="p-6 flex flex-col flex-1">
              {/* Plan name + price */}
              <div className="mb-4">
                <h4 className="text-lg font-bold">{plan.name}</h4>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">{plan.priceLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.userLimit}
                </p>
              </div>

              {/* Feature list */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              {plan.isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : plan.canUpgrade ? (
                <Button
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => onUpgrade(plan.key, plan.name)}
                >
                  {plan.key === 'enterprise' ? 'Contact us' : `Upgrade to ${plan.name}`}
                </Button>
              ) : (
                <Button variant="ghost" className="w-full" disabled>
                  Included in your plan
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}