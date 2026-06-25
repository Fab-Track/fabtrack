import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bug, CheckCircle2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import IssueRow from './IssueRow';
import IssuePagination from './IssuePagination';

const PAGE_SIZE = 15;

export default function IssueList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Reset page + selection when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [statusFilter, typeFilter]);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'issues', statusFilter, typeFilter, page],
    queryFn: async () => {
      const res = await base44.functions.invoke('listIssues', {
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        limit: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      });
      return res.data || { issues: [], open_count: 0, total: 0, has_more: false };
    },
    refetchInterval: 30000,
  });

  const issues = data?.issues || [];
  const openCount = data?.open_count || 0;
  const total = data?.total || 0;
  const hasMore = data?.has_more || false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Pull back if we navigated beyond available data
  useEffect(() => {
    if (!isLoading && issues.length === 0 && page > 1) {
      setPage(1);
    }
  }, [isLoading, issues.length, page]);

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

  const bulkResolveMutation = useMutation({
    mutationFn: (issueIds) =>
      base44.functions.invoke('updateIssue', { issue_ids: issueIds, status: 'resolved' }),
    onSuccess: (res) => {
      if (res.data?.success) {
        const count = res.data?.resolved_count || 0;
        toast.success(`${count} issue${count !== 1 ? 's' : ''} resolved`);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ['super-admin', 'issues'] });
      } else {
        toast.error(res.data?.error || 'Bulk resolve failed');
      }
    },
    onError: () => toast.error('Failed to resolve issues'),
  });

  const handleStatusChange = (issueId, newStatus) => {
    updateMutation.mutate({ issue_id: issueId, status: newStatus });
  };

  const handleSaveNotes = (issueId) => {
    if (!adminNote.trim()) return;
    updateMutation.mutate({ issue_id: issueId, admin_notes: adminNote.trim() });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    setAdminNote('');
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = issues.length > 0 && issues.every((i) => selectedIds.has(i.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        issues.forEach((i) => next.delete(i.id));
      } else {
        issues.forEach((i) => next.add(i.id));
      }
      return next;
    });
  };

  const handleResolveSelected = () => {
    bulkResolveMutation.mutate([...selectedIds]);
  };

  const handleResolveAllOnPage = () => {
    const ids = issues.map((i) => i.id);
    const wasHasMore = hasMore;
    bulkResolveMutation.mutate(ids, {
      onSuccess: () => {
        if (wasHasMore) setPage((p) => p + 1);
      },
    });
  };

  const allOnPageSelected = issues.length > 0 && issues.every((i) => selectedIds.has(i.id));
  const selectedCount = selectedIds.size;

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
        {/* Bulk action bar — shown when items are selected */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm font-medium">{selectedCount} selected</span>
            <Button
              size="sm"
              className="h-7"
              onClick={handleResolveSelected}
              disabled={bulkResolveMutation.isPending}
            >
              {bulkResolveMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Resolve Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 ml-auto"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

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
          <>
            {/* Select-all header + Resolve All on Page */}
            <div className="flex items-center gap-3 px-1 pb-2">
              <Checkbox
                checked={allOnPageSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all on page"
              />
              <span className="text-xs text-muted-foreground">
                {allOnPageSelected ? `All ${issues.length} on page selected` : 'Select all on page'}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs ml-auto gap-1.5"
                onClick={handleResolveAllOnPage}
                disabled={bulkResolveMutation.isPending}
              >
                {bulkResolveMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ListChecks className="w-3.5 h-3.5" />
                )}
                Resolve All on Page
              </Button>
            </div>

            <div className="space-y-2">
              {issues.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  isExpanded={expandedId === issue.id}
                  isSelected={selectedIds.has(issue.id)}
                  onToggleExpand={toggleExpand}
                  onToggleSelect={toggleSelect}
                  onStatusChange={handleStatusChange}
                  onSaveNotes={handleSaveNotes}
                  adminNote={adminNote}
                  setAdminNote={setAdminNote}
                  isUpdating={updateMutation.isPending}
                />
              ))}
            </div>

            <IssuePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}