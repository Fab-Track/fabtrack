import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  History, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const ACTION_LABELS = {
  org_created: 'Org Created',
  org_updated: 'Org Updated',
  org_suspended: 'Org Suspended',
  org_reactivated: 'Org Reactivated',
  org_deleted: 'Org Deleted',
  plan_changed: 'Plan Changed',
  owner_assigned: 'Owner Assigned',
  owner_reinvited: 'Owner Re-invited',
  user_deactivated: 'User Deactivated',
  user_reactivated: 'User Reactivated',
  impersonation_started: 'Impersonation Started',
  impersonation_ended: 'Impersonation Ended',
};

const ACTION_COLORS = {
  org_created: 'bg-blue-100 text-blue-700 border-blue-200',
  org_updated: 'bg-slate-100 text-slate-700 border-slate-200',
  org_suspended: 'bg-red-100 text-red-700 border-red-200',
  org_reactivated: 'bg-green-100 text-green-700 border-green-200',
  org_deleted: 'bg-red-200 text-red-800 border-red-300',
  plan_changed: 'bg-amber-100 text-amber-700 border-amber-200',
  owner_assigned: 'bg-purple-100 text-purple-700 border-purple-200',
  owner_reinvited: 'bg-purple-100 text-purple-700 border-purple-200',
  user_deactivated: 'bg-red-100 text-red-700 border-red-200',
  user_reactivated: 'bg-green-100 text-green-700 border-green-200',
  impersonation_started: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  impersonation_ended: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export default function SuperAdminAuditLog({ organizationId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'audit-log', organizationId],
    queryFn: async () => {
      const res = await base44.functions.invoke('logSuperAdminAction', {
        action: 'list',
        organizationId,
        limit: 50,
      });
      return res.data?.logs || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No audit entries yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5" />
          Audit Log ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border bg-card text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge className={ACTION_COLORS[entry.action_type] || ''}>
                    {ACTION_LABELS[entry.action_type] || entry.action_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_date), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                <p className="text-xs">{entry.action_detail}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>{entry.admin_name || entry.admin_email}</span>
                  {entry.affected_user_email && (
                    <span>• User: {entry.affected_user_name || entry.affected_user_email}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}