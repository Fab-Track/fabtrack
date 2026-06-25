import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, ArrowRight } from 'lucide-react';

export default function BillingSection() {
  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h2 className="font-semibold text-base">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground">Manage your FabTrack plan and payment method.</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Billing & Subscription</h3>
              <p className="text-sm text-muted-foreground mt-1">
                View your current plan, compare tiers, upgrade, and review billing history.
              </p>
            </div>
            <Link to="/billing">
              <Button className="gap-1.5">
                Go to Billing
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}