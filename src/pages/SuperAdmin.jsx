import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Plus, Users, Briefcase, User, Loader2, Shield, ArrowLeft, ChevronRight, Eye, LogOut, Bug, CheckCircle, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { startOrgImpersonation } from '@/components/super-admin/SuperAdminBanner';
import OrgDetail from '@/components/super-admin/OrgDetail';
import SuperAdminAuditLog from '@/components/super-admin/SuperAdminAuditLog';
import IssueList from '@/components/super-admin/IssueList';
import PlatformAnalytics from '@/components/super-admin/PlatformAnalytics';

export default function SuperAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);

  const isSuperAdmin = (user?.roles || []).includes('super_admin');

  const { data: orgsData, isLoading } = useQuery({
    queryKey: ['super-admin', 'organizations'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listOrganizations', {});
      return res.data?.organizations || [];
    },
    enabled: isSuperAdmin,
  });

  const createOrgMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createOrganization', data),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(`Organization "${res.data.organization.name}" created. Owner invited at ${res.data.owner.email}.`);
        setName('');
        setOwnerName('');
        setOwnerEmail('');
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
      } else {
        toast.error(res.data?.error || 'Failed to create organization');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to create organization');
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      toast.error('All fields are required');
      return;
    }
    createOrgMutation.mutate({ name: name.trim(), ownerName: ownerName.trim(), ownerEmail: ownerEmail.trim() });
  };

  const createDemoMutation = useMutation({
    mutationFn: () => base44.functions.invoke('createDemoOrg', {}),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(`Demo organization "${res.data.organization.name}" created with sample data.`);
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
      } else {
        toast.error(res.data?.error || 'Failed to create demo org');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to create demo org');
    },
  });

  const resetDemoMutation = useMutation({
    mutationFn: () => base44.functions.invoke('resetDemoOrg', {}),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success(res.data.message || 'Demo org reset successfully.');
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'org-detail'] });
      } else {
        toast.error(res.data?.error || 'Failed to reset demo org');
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || err.message || 'Failed to reset demo org');
    },
  });

  const handleOrgClick = (org) => {
    setSelectedOrg(org);
  };

  const handleBack = () => {
    setSelectedOrg(null);
    queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
  };

  const handleImpersonate = async () => {
    if (!selectedOrg) return;
    await base44.entities.SuperAdminAuditLog.create({
      admin_email: user?.email || '',
      admin_name: user?.full_name || user?.email || '',
      action_type: 'impersonation_started',
      organization_id: selectedOrg.id,
      organization_name: selectedOrg.name,
      action_detail: `Started viewing "${selectedOrg.name}" as super admin support session`,
    }).catch(() => {});
    startOrgImpersonation(selectedOrg.id, selectedOrg.name);
    navigate('/jobs');  // ← lands inside the org's job board
};

  const handleDeleteOrg = () => {
    setSelectedOrg(null);
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This area is only accessible to super admins.
            </p>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail view for selected org
  if (selectedOrg) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          <OrgDetail
            org={selectedOrg}
            onBack={handleBack}
            onImpersonate={handleImpersonate}
            onDelete={handleDeleteOrg}
          />
        </div>
      </div>
    );
  }

  const statusBadgeColor = {
    trial: 'bg-blue-100 text-blue-700 border-blue-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    past_due: 'bg-amber-100 text-amber-700 border-amber-200',
    suspended: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">Super Admin</h1>
          <Badge variant="secondary" className="ml-2">Platform Owner</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Create Organization Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="w-5 h-5" />
                Create Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Demo Org Quick Create */}
              <div className="mb-4 p-4 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-950" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-amber-950">Demo Organization</p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Instantly create a pre-populated demo shop with sample jobs, customers, and team members — perfect for sales demos.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-950 hover:bg-amber-900 text-amber-50 gap-1.5"
                    onClick={() => createDemoMutation.mutate()}
                    disabled={createDemoMutation.isPending}
                  >
                    {createDemoMutation.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Demo…</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> Create Demo Org</>
                    )}
                  </Button>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="e.g. Denver Steel Works"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="owner-name">Owner Name</Label>
                  <Input
                    id="owner-name"
                    placeholder="e.g. John Smith"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-email">Owner Email</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    placeholder="owner@example.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createOrgMutation.isPending}
                >
                  {createOrgMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4 mr-2" />
                      Create Organization
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Creates an empty organization with default settings and invites the owner via email.
                  The new org starts with zero data — completely isolated from all other organizations.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Organizations List */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5" />
                All Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !orgsData || orgsData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No organizations yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orgsData.map((org) => {
                    const status = org.subscription_status || org.is_active ? 'trial' : 'suspended';
                    return (
                      <button
                        key={org.id}
                        onClick={() => handleOrgClick(org)}
                        className="w-full text-left flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{org.name}</h3>
                            {org.is_demo && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 shrink-0 gap-1">
                                <Sparkles className="w-3 h-3" /> Demo
                              </Badge>
                            )}
                            <Badge className={statusBadgeColor[org.subscription_status || 'trial'] || ''}>
                              {org.subscription_status || (org.is_active ? 'active' : 'inactive')}
                            </Badge>
                            <Badge variant="outline" className="shrink-0 capitalize">{org.plan}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {org.owner_name || 'No owner'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {org.user_count} user{org.user_count !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {org.job_count} job{org.job_count !== 1 ? 's' : ''}
                            </span>
                            <span>Created {new Date(org.created_date).toLocaleDateString()}</span>
                            {org.stripe_subscription_id && (
                              <span className="flex items-center gap-1 text-green-600 font-medium">
                                <CheckCircle className="w-3 h-3" /> Billing Linked
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Platform Analytics */}
        <div className="mt-6">
          <PlatformAnalytics />
        </div>

        {/* Issues & Bug Tracker */}
        <div className="mt-6">
          <IssueList />
        </div>

        {/* Global Audit Log */}
        <div className="mt-6">
          <SuperAdminAuditLog organizationId={null} />
        </div>

        {/* Data Isolation Confirmation */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Data Isolation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Every entity record (jobs, customers, employees, estimates, invoices, messages, settings, and all others)
              is scoped to a specific organization via <code className="text-xs bg-muted px-1 py-0.5 rounded">organization_id</code>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <h4 className="font-medium text-sm text-success mb-1">New Organization Isolation</h4>
                <p className="text-xs text-muted-foreground">
                  New organizations start with zero records. They cannot see any data from other organizations.
                  Their owner logs into a completely empty FabTrack instance.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <h4 className="font-medium text-sm text-success mb-1">Existing Organization Protection</h4>
                <p className="text-xs text-muted-foreground">
                  Your existing organization's data is scoped to its own <code className="text-xs bg-muted px-1 py-0.5 rounded">organization_id</code>.
                  No other organization can access it. Full isolation in both directions.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Super admins are the only users without an organization scope — they can see all organizations
              for platform management and support purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}