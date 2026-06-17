import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Plus, Users, Briefcase, User, Loader2, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function SuperAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

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
                  {orgsData.map((org) => (
                    <div
                      key={org.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{org.name}</h3>
                          <Badge variant={org.is_active ? 'default' : 'secondary'} className="shrink-0">
                            {org.is_active ? 'Active' : 'Inactive'}
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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