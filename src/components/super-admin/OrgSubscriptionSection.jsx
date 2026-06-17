import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, CheckCircle, Clock, Ban, Play } from 'lucide-react';

const STATUS_INFO = {
  trial: { label: 'Trial', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, desc: 'Access is active. Trial period in effect.' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, desc: 'Full access. Subscription is current.' },
  past_due: { label: 'Past Due', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle, desc: 'Access is still active but payment is past due.' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700 border-red-200', icon: Ban, desc: 'Access is blocked. Users see "subscription inactive" message.' },
};

export default function OrgSubscriptionSection({ org }) {
  const queryClient = useQueryClient();
  const currentStatus = org.subscription_status || 'trial';

  const updateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateOrganization', data),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(`Subscription status updated`);
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-detail', org.id] });
      } else {
        toast.error(res.data?.error || 'Update failed');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Update failed');
    },
  });

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({
      organizationId: org.id,
      subscriptionStatus: newStatus,
    });
  };

  const handlePlanChange = (newPlan) => {
    updateMutation.mutate({
      organizationId: org.id,
      plan: newPlan,
    });
  };

  const currentInfo = STATUS_INFO[currentStatus] || STATUS_INFO.trial;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <currentInfo.icon className="w-5 h-5" />
          Subscription &amp; Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Badge className={currentInfo.color}>{currentInfo.label}</Badge>
          <span className="text-sm text-muted-foreground">{currentInfo.desc}</span>
        </div>

        {/* Plan */}
        <div>
          <h4 className="text-sm font-medium mb-3">Plan Tier</h4>
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
          <h4 className="text-sm font-medium mb-3">Subscription Status</h4>
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