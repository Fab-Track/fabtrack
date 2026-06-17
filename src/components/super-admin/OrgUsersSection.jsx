import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  User, Crown, Mail, Loader2, Ban, Play, Clock,
} from 'lucide-react';
import { format } from 'date-fns';

export default function OrgUsersSection({ org }) {
  const queryClient = useQueryClient();
  const [assignOwnerEmail, setAssignOwnerEmail] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'org-users', org.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('manageOrgUsers', {
        organizationId: org.id,
        action: 'list',
      });
      return res.data?.users || [];
    },
  });

  const assignOwnerMutation = useMutation({
    mutationFn: (email) => base44.functions.invoke('manageOrgUsers', {
      organizationId: org.id,
      action: 'assign_owner',
      targetEmail: email,
    }),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(res.data.message);
        setAssignOwnerEmail('');
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-users', org.id] });
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
      } else {
        toast.error(res.data?.error || 'Failed to assign owner');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to assign owner');
    },
  });

  const reinviteMutation = useMutation({
    mutationFn: (email) => base44.functions.invoke('manageOrgUsers', {
      organizationId: org.id,
      action: 'reinvite',
      targetEmail: email,
    }),
    onSuccess: (res) => {
      if (res.data?.success) toast.success(res.data.message);
      else toast.error(res.data?.error || 'Failed');
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message || 'Failed'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (email) => base44.functions.invoke('manageOrgUsers', {
      organizationId: org.id,
      action: 'deactivate',
      targetEmail: email,
    }),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(res.data.message);
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-users', org.id] });
      } else toast.error(res.data?.error || 'Failed');
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message || 'Failed'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (email) => base44.functions.invoke('manageOrgUsers', {
      organizationId: org.id,
      action: 'reactivate',
      targetEmail: email,
    }),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(res.data.message);
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-users', org.id] });
      } else toast.error(res.data?.error || 'Failed');
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message || 'Failed'),
  });

  const handleAssignOwner = (e) => {
    e.preventDefault();
    if (!assignOwnerEmail.trim()) {
      toast.error('Enter an email address');
      return;
    }
    assignOwnerMutation.mutate(assignOwnerEmail.trim());
  };

  const handleChangeRole = (email, newRole) => {
    base44.functions.invoke('manageOrgUsers', {
      organizationId: org.id,
      action: 'change_role',
      targetEmail: email,
      targetRole: newRole,
    }).then((res) => {
      if (res.data?.success) {
        toast.success(res.data.message);
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-users', org.id] });
      } else toast.error(res.data?.error || 'Failed');
    }).catch((err) => toast.error(err?.response?.data?.error || err.message || 'Failed'));
  };

  const statusBadgeColor = {
    active: 'bg-green-100 text-green-700 border-green-200',
    invited: 'bg-blue-100 text-blue-700 border-blue-200',
    pending_setup: 'bg-amber-100 text-amber-700 border-amber-200',
    deactivated: 'bg-red-100 text-red-700 border-red-200',
    locked: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          Users ({data?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Assign Owner */}
        <form onSubmit={handleAssignOwner} className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-accent" /> Assign Owner
          </h4>
          <p className="text-xs text-muted-foreground">
            Enter the email of an existing user in this organization. They will be promoted to owner. Previous owner (if any) will be demoted.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="user@example.com"
              value={assignOwnerEmail}
              onChange={(e) => setAssignOwnerEmail(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={assignOwnerMutation.isPending}>
              {assignOwnerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
              Assign
            </Button>
          </div>
        </form>

        {/* User List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users in this organization.
          </p>
        ) : (
          <div className="space-y-2">
            {data.map((u) => (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{u.full_name || u.email}</span>
                    {u.is_owner && (
                      <Badge className="bg-accent/10 text-accent border-accent/20">
                        <Crown className="w-3 h-3 mr-1" /> Owner
                      </Badge>
                    )}
                    {u.roles?.map((r) => (
                      r !== 'owner' && (
                        <Badge key={r} variant="secondary" className="text-[10px] capitalize">
                          {r}
                        </Badge>
                      )
                    ))}
                    <Badge className={statusBadgeColor[u.account_status || 'active'] || ''}>
                      {u.account_status || 'active'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {u.email}
                    {u.last_login_at && ` • Last login: ${format(new Date(u.last_login_at), 'MMM d, yyyy HH:mm')}`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <Select
                    value=""
                    onValueChange={(role) => {
                      if (role) handleChangeRole(u.email, role);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-[100px]">
                      <SelectValue placeholder="Add role" />
                    </SelectTrigger>
                    <SelectContent>
                      {['admin', 'shop_manager', 'estimator', 'fabricator', 'installer', 'accountant', 'design_specialist', 'payroll']
                        .filter((r) => !(u.roles || []).includes(r))
                        .map((r) => (
                          <SelectItem key={r} value={r} className="capitalize text-xs">
                            {r}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {(u.account_status === 'invited' || u.account_status === 'pending_setup') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => reinviteMutation.mutate(u.email)}
                      disabled={reinviteMutation.isPending}
                    >
                      <Mail className="w-3 h-3 mr-1" /> Resend
                    </Button>
                  )}

                  {u.account_status !== 'deactivated' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => deactivateMutation.mutate(u.email)}
                      disabled={deactivateMutation.isPending}
                    >
                      <Ban className="w-3 h-3 mr-1" /> Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => reactivateMutation.mutate(u.email)}
                      disabled={reactivateMutation.isPending}
                    >
                      <Play className="w-3 h-3 mr-1" /> Reactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}