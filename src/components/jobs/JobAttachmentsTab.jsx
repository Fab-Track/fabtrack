import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Paperclip, Trash2, ExternalLink, FileText, Image, File } from "lucide-react";
import JobAttachmentsNew from "@/components/jobs/JobAttachmentsNew";

const LABELS = ["Drawing", "Cut List", "Photo", "Permit", "Signed Estimate", "Other"];

const LABEL_STYLES = {
  Drawing: "bg-blue-100 text-blue-800",
  "Cut List": "bg-amber-100 text-amber-800",
  Photo: "bg-purple-100 text-purple-800",
  Permit: "bg-red-100 text-red-800",
  "Signed Estimate": "bg-emerald-100 text-emerald-800",
  Other: "bg-muted text-muted-foreground",
};

function FileIcon({ type }) {
  if (type?.startsWith("image/")) return <Image className="w-5 h-5 text-purple-400" />;
  if (type?.includes("pdf")) return <FileText className="w-5 h-5 text-red-400" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

export default function JobAttachmentsTab({ job }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ label: "Drawing", version: "v1", notes: "" });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", job.id],
    queryFn: () => base44.entities.JobAttachment.filter({ job_id: job.id }),
    enabled: !!job.id,
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.JobAttachment.delete(id),
    onSuccess: () => qc.invalidateQueries(["attachments", job.id]),
  });

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadOpen(true);
    e.target.value = "";
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pendingFile });
      await base44.entities.JobAttachment.create({
        job_id: job.id,
        job_number: job.job_number,
        file_url,
        file_name: pendingFile.name,
        file_type: pendingFile.type,
        label: form.label,
        version: form.version,
        notes: form.notes,
        uploaded_by: "me",
      });
      qc.invalidateQueries(["attachments", job.id]);
      setUploadOpen(false);
      setPendingFile(null);
      setForm({ label: "Drawing", version: "v1", notes: "" });
    } finally {
      setUploading(false);
    }
  }

  // Group by label
  const grouped = LABELS.reduce((acc, l) => {
    const items = attachments.filter(a => a.label === l);
    if (items.length) acc[l] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <JobAttachmentsNew job={job} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{attachments.length} file{attachments.length !== 1 ? "s" : ""} attached</p>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4" /> Upload File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : attachments.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-10 text-center">
          <Paperclip className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No files attached yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Upload drawings, cut lists, photos, permits, or signed estimates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([label, files]) => (
            <div key={label}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</h4>
              <div className="space-y-1.5">
                {files.map(att => (
                  <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
                    <FileIcon type={att.file_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.file_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge className={`text-xs ${LABEL_STYLES[att.label]}`}>{att.label}</Badge>
                        {att.version && <span className="text-xs text-muted-foreground">{att.version}</span>}
                        {att.notes && <span className="text-xs text-muted-foreground truncate">· {att.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={att.file_url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => del.mutate(att.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload details dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm truncate">{pendingFile?.name}</span>
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Select value={form.label} onValueChange={v => setForm({ ...form, label: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Version</Label>
              <Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="v1, Rev A…" />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); setPendingFile(null); }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}