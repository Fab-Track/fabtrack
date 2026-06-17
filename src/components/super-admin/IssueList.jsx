import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Bug, AlertTriangle, User, Building2, ExternalLink, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const statusBadgeColors = {
  open: 'bg-red-100 text-red-700 border-red-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
};

const statusOptions = ['', 'open', 'in_progress', 'resolved'];
const typeOptions = ['', 'user_report', 'system_error'];

export default function IssueList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'issues', statusFilter, typeFilter],
    queryFn: async () => {
      const res = await base44.functions.invoke('listIssues', {
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        limit: 100,
      });
      return res.data || { issues: [], open_count: 0 };
    },
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('updateIssue', payload),
    onSuccess: (res) => {
      if (res.data?.success) {
        toast.success('Issue updated');
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'issues'] });
        setAdminNote('');
      } else {
        toast.error(res.data?.error || 'Update failed');
      }
    },
    onError: () => toast.error('Failed to update issue'),
  });

  const handleStatusChange = (issueId, newStatus) => {
    updateMutation.mutate({ issue_id: issueId, status: newStatus });
  };

  const handleSaveNotes = (issueId) => {
    if (!adminNote.trim()) return;
    updateMutation.mutate({ issue_id: issueId, admin_notes: adminNote.trim() });
  };

  const issues = data?.issues || [];
  const openCount = data?.open_count || 0;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setAdminNote('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bug className="w-5 h-5" />
            Issues & Bug Tracker
            {openCount > 0 && (
              <Badge variant="destructive" className="ml-1">{openCount} open</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 sm:ml-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Types</SelectItem>
                <SelectItem value="user_report">User Reports</SelectItem>
                <SelectItem value="system_error">System Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bug className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No issues found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => {
              const isExpanded = expandedId === issue.id;
              const TypeIcon = issue.type === 'system_error' ? AlertTriangle : Bug;
              const typeLabel = issue.type === 'system_error' ? 'System Error' : 'User Report';

              return (
                <div key={issue.id} className="rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                  <button
                    onClick={() => toggleExpand(issue.id)}
                    className="w-full text-left p-4 flex flex-col sm:flex-row sm:items-center gap-2"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <TypeIcon className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                      <Badge className={statusBadgeColors[issue.status] || ''}>{issue.status}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {issue.organization_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {issue.user_name}
                        </span>
                        <span>{new Date(issue.created_date).toLocaleString()}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      {/* Full description */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-sm whitespace-pre-wrap mt-1">{issue.description}</p>
                      </div>

                      {/* Context details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Page:</span>
                          <span className="ml-1 font-mono">{issue.page_route || '/'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Role:</span>
                          <span className="ml-1">{issue.user_role}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Org:</span>
                          <span className="ml-1">{issue.organization_name}</span>
                        </div>
                        {issue.page_url && (
                          <div className="col-span-2 sm:col-span-3">
                            <span className="text-muted-foreground">URL:</span>
                            <span className="ml-1 font-mono truncate">{issue.page_url}</span>
                          </div>
                        )}
                      </div>

                      {/* Error stack */}
                      {issue.error_stack && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Stack Trace</Label>
                          <pre className="text-xs bg-muted/50 rounded p-2 mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                            {issue.error_stack}
                          </pre>
                        </div>
                      )}

                      {/* Screenshot */}
                      {issue.screenshot_url && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Screenshot</Label>
                          <img
                            src={issue.screenshot_url}
                            alt="Issue screenshot"
                            className="mt-1 max-h-48 rounded border object-contain"
                          />
                        </div>
                      )}

                      <Separator />

                      {/* Admin actions */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground shrink-0">Status:</Label>
                          {statusOptions.filter(Boolean).map((s) => (
                            <Button
                              key={s}
                              variant={issue.status === s ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleStatusChange(issue.id, s)}
                              disabled={updateMutation.isPending}
                            >
                              {s === 'open' ? 'Open' : s === 'in_progress' ? 'In Progress' : 'Resolved'}
                            </Button>
                          ))}
                        </div>

                        {/* Admin notes */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Internal Notes
                          </Label>
                          {issue.admin_notes && (
                            <p className="text-sm text-muted-foreground bg-muted/30 rounded p-2 whitespace-pre-wrap">
                              {issue.admin_notes}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Add notes about your investigation..."
                              value={adminNote}
                              onChange={(e) => setAdminNote(e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!adminNote.trim() || updateMutation.isPending}
                              onClick={() => handleSaveNotes(issue.id)}
                              className="shrink-0"
                            >
                              {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </Button>
                          </div>
                        </div>

                        {issue.resolved_by && (
                          <p className="text-xs text-muted-foreground">
                            Resolved by {issue.resolved_by} on {new Date(issue.resolved_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}