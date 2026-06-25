import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Bug, AlertTriangle, User, Building2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

const statusBadgeColors = {
  open: 'bg-red-100 text-red-700 border-red-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
};

const statusOptions = ['', 'open', 'in_progress', 'resolved'];

export default function IssueRow({
  issue,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onStatusChange,
  onSaveNotes,
  adminNote,
  setAdminNote,
  isUpdating,
}) {
  const isSystemError = issue.type === 'system_error';
  const TypeIcon = isSystemError ? AlertTriangle : Bug;
  const typeLabel = isSystemError ? 'System Error' : 'User Report';
  const borderClass = isSystemError ? 'border-l-red-400' : 'border-l-blue-300';

  return (
    <div
      className={`rounded-lg border border-l-4 ${borderClass} bg-card hover:bg-muted/20 transition-colors ${
        isSelected ? 'ring-1 ring-primary/30 bg-primary/5' : ''
      }`}
    >
      {/* Row header */}
      <div className="w-full text-left p-4 flex items-center gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(issue.id)}
          aria-label={`Select issue ${issue.id}`}
          className="shrink-0"
        />
        <button
          onClick={() => onToggleExpand(issue.id)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <div className="flex items-center gap-2 shrink-0">
            <TypeIcon className={isSystemError ? 'w-4 h-4 text-red-500' : 'w-4 h-4 text-blue-500'} />
            <Badge
              variant="outline"
              className={`text-[10px] ${
                isSystemError ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              {typeLabel}
            </Badge>
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
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <p className="text-sm whitespace-pre-wrap mt-1">{issue.description}</p>
          </div>

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

          {issue.error_stack && (
            <div>
              <Label className="text-xs text-muted-foreground">Stack Trace</Label>
              <pre className="text-xs bg-muted/50 rounded p-2 mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                {issue.error_stack}
              </pre>
            </div>
          )}

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

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-xs text-muted-foreground shrink-0">Status:</Label>
              {statusOptions.filter(Boolean).map((s) => (
                <Button
                  key={s}
                  variant={issue.status === s ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onStatusChange(issue.id, s)}
                  disabled={isUpdating}
                >
                  {s === 'open' ? 'Open' : s === 'in_progress' ? 'In Progress' : 'Resolved'}
                </Button>
              ))}
            </div>

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
                  disabled={!adminNote.trim() || isUpdating}
                  onClick={() => onSaveNotes(issue.id)}
                  className="shrink-0"
                >
                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
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
}