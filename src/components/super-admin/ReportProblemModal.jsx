import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X, Bug } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportProblemModal({ open, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setScreenshotUrl(res.file_url);
    } catch (_) {
      toast.error('Failed to upload screenshot');
    } finally {
      setUploading(false);
    }
  };

  const removeScreenshot = () => {
    setScreenshotUrl(null);
    setScreenshotFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('reportIssue', {
        type: 'user_report',
        title: title.trim(),
        description: description.trim(),
        screenshot_url: screenshotUrl,
        page_url: window.location.href,
      });
      if (res.data?.success) {
        toast.success('Thank you! Your report has been submitted.');
        setTitle('');
        setDescription('');
        setScreenshotUrl(null);
        setScreenshotFile(null);
        onClose();
      } else {
        toast.error(res.data?.error || 'Failed to submit report');
      }
    } catch (err) {
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Report a Problem
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="issue-title">What's the problem?</Label>
            <Input
              id="issue-title"
              placeholder="Brief summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-desc">Describe what happened</Label>
            <Textarea
              id="issue-desc"
              placeholder="What were you doing? What went wrong? Any error messages?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={3000}
            />
          </div>

          {/* Screenshot upload */}
          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            {screenshotFile ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{screenshotFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Uploaded'}
                  </p>
                </div>
                {!uploading && (
                  <Button variant="ghost" size="icon" onClick={removeScreenshot} type="button">
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {uploading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Attach screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || uploading}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}