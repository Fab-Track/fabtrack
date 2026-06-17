import React from 'react';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowUpCircle } from 'lucide-react';
import { PLANS } from '@/lib/plans';

/**
 * Wraps children with a feature gate.
 *
 * If the org's plan includes the feature, children render normally.
 * If not, an upgrade prompt is shown instead.
 *
 * Props:
 *   featureKey  — key from lib/plans.js FEATURES
 *   fallback    — optional custom locked UI (overrides default prompt)
 *   children    — the protected content
 */
export default function FeatureGate({ featureKey, fallback, children }) {
  const { hasAccess, lockedMessage, upgradeTo, featureLabel, plan } = useFeatureGate(featureKey);
  const { user } = useAuth();
  const isOwner = (user?.roles || []).includes('owner');

  if (hasAccess) return children;

  const upgradePlanName = upgradeTo ? PLANS[upgradeTo]?.displayName || upgradeTo : null;

  if (fallback) return fallback;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-5 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-sm">{featureLabel || 'Feature'} Locked</p>
          <p className="text-xs text-muted-foreground mt-1">{lockedMessage}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Current plan: <span className="font-medium capitalize">{plan}</span>
          {upgradePlanName && (
            <> — upgrade to <span className="font-medium">{upgradePlanName}</span> to unlock</>
          )}
        </p>
        {isOwner && (
          <Button size="sm" variant="outline" className="gap-1.5 text-amber-700 border-amber-300">
            <ArrowUpCircle className="w-4 h-4" />
            Upgrade Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}