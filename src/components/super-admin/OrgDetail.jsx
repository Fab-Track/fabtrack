import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Building2, Users, Briefcase, CalendarDays, Shield, Loader2,
  Pencil, Save, X, Eye, LogOut,
} from 'lucide-react';
import { format } from 'date-fns';
import OrgSubscriptionSection from '@/components/super-admin/OrgSubscriptionSection';
import OrgUsersSection from '@/components/super-admin/OrgUsersSection';
import SuperAdminAuditLog from '@/components/super-admin/SuperAdminAuditLog';

export default function OrgDetail({ org, onBack, onImpersonate, onDelete }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(org.name);
  const [editPlan, setEditPlan] = useState(org.plan);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data: orgData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['super-admin', 'org-detail', org.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('listOrganizations', {});
      const orgs = res.data?.organizations || [];
      return orgs.find((o) => o.id === org.id) || org;
    },
  });

  const displayOrg = orgData || org;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateOrganization', data),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(`Updated "${res.data.organization.name}"`);
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-detail', org.id] });
        setEditMode(false);
      } else {
        toast.error(res.data?.error || 'Update failed');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Update failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.functions.invoke('deleteOrganization', {
      organizationId: org.id,
      confirmation: 'DELETE',
    }),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(res.data.message);
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
        onBack();
      } else {
        toast.error(res.data?.error || 'Delete failed');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Delete failed');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      organizationId: org.id,
      name: editName.trim() !== org.name ? editName.trim() : undefined,
      plan: editPlan !== org.plan ? editPlan : undefined,
    });
  };

  const handleDelete = () => {
    if (deleteConfirmText !== org.name) {
      toast.error('Type the organization name exactly to confirm');
      return;
    }
    deleteMutation.mutate();
  };

  const statusColor = {
    trial: 'bg-blue-100 text-blue-700 border-blue-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    past_due: 'bg-amber-100 text-amber-700 border-amber-200',
    suspended: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6">
      {/* Header & Back */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <X className="w-5 h-5" />
          </Button>
          <Building2 className="w-5 h-5 text-accent shrink-0" />
          {editMode ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-xl font-bold max-w-[300px]"
            />
          ) : (
            <h2 className="text-xl font-bold tracking-tight">{displayOrg.name}</h2>
          )}
          <Badge className={statusColor[displayOrg.subscription_status || 'trial']}>
            {displayOrg.subscription_status || 'trial'}
          </Badge>
          {editMode ? (
            <Select value={editPlan} onValueChange={setEditPlan}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="capitalize">{displayOrg.plan}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEditName(org.name); setEditPlan(org.plan); }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={onImpersonate}>
                <Eye className="w-4 h-4 mr-1" /> View as Org
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Users', value: displayOrg.user_count || 0, icon: Users },
          { label: 'Jobs', value: displayOrg.job_count || 0, icon: Briefcase },
          { label: 'Customers', value: displayOrg.customer_count || 0, icon: Users },
          { label: 'Employees', value: displayOrg.employee_count || 0, icon: Briefcase },
          { label: 'Created', value: displayOrg.created_date ? format(new Date(displayOrg.created_date), 'MMM d, yyyy') : '-', icon: CalendarDays },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <stat.icon className="w-4 h-4" />
                <span className="text-xs">{stat.label}</span>
              </div>
              <p className="text-lg font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription Management */}
      <OrgSubscriptionSection org={displayOrg} />

      {/* User Management */}
      <OrgUsersSection org={displayOrg} />

      {/* Audit Log */}
      <SuperAdminAuditLog organizationId={org.id} />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Delete Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">
              This will permanently delete <strong>{displayOrg.name}</strong> and ALL associated data including jobs, customers, employees, estimates, invoices, messages, and every other record. Users will be unlinked from this organization but not deleted.
            </p>
            <p className="text-sm font-semibold">This action cannot be undone.</p>
            <div className="space-y-2">
              <Label>
                Type <strong>{displayOrg.name}</strong> to confirm:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={displayOrg.name}
                className="border-destructive"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending || deleteConfirmText !== displayOrg.name}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Permanently Delete
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}