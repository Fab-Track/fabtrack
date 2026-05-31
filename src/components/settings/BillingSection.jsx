import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, ExternalLink } from "lucide-react";

export default function BillingSection() {
  const [showCancel, setShowCancel] = useState(false);

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="font-semibold text-base">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground">Manage your FabTrack plan and payment method.</p>
      </div>

      {/* Current plan */}
      <div className="border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Current Plan</p>
            <p className="font-semibold text-base">FabTrack Pro</p>
          </div>
          <Badge className="bg-green-100 text-green-700">Active</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Next billing date: July 1, 2026</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="w-4 h-4" />
          <span>Visa ending in •••• 4242</span>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">Edit</Button>
        </div>
      </div>

      <Button variant="outline" className="gap-1.5">
        <ExternalLink className="w-3.5 h-3.5" /> Manage Subscription
      </Button>

      <div className="pt-4 border-t">
        {!showCancel ? (
          <button
            onClick={() => setShowCancel(true)}
            className="text-xs text-destructive hover:underline"
          >
            Cancel subscription
          </button>
        ) : (
          <div className="border border-destructive/30 rounded-xl p-4 space-y-3 bg-destructive/5">
            <p className="text-sm font-medium text-destructive">Are you sure you want to cancel?</p>
            <p className="text-xs text-muted-foreground">Your access will continue until the end of your current billing period. This action cannot be undone.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => setShowCancel(false)}>Yes, Cancel Subscription</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCancel(false)}>Keep My Subscription</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}