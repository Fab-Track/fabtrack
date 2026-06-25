import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Clock } from 'lucide-react';

export default function UpgradePlaceholderModal({ open, onOpenChange, planName }) {
  const mailto = `mailto:support@fabtrack.app?subject=Upgrade to ${planName || 'a paid plan'}&body=I'd like to upgrade my FabTrack subscription to the ${planName || 'paid'} plan.%0D%0A%0D%0AOrganization: %0D%0AContact: %0D%0AMessage: `;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Upgrade to {planName}
          </DialogTitle>
          <DialogDescription>
            Payment processing is coming soon. In the meantime, reach out and we'll get you set up right away.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Online checkout is being configured for self-serve upgrades.
              We can manually set up your subscription today — typically within a few hours.
            </p>
          </div>
          <p className="text-sm font-medium">
            Email us to get started:
          </p>
          <a href={mailto} className="block">
            <Button className="w-full gap-2">
              <Mail className="w-4 h-4" />
              Email to Upgrade
            </Button>
          </a>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}