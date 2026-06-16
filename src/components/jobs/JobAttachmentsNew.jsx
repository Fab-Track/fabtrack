import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Upload, FileImage, FileText, Ruler, Camera, Lightbulb, Paperclip,
  ExternalLink, Loader2, Trash2, Image, File, Plus, FolderOpen,
  ChevronRight, X,
} from "lucide-react";

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "inspiration_photos", label: "Inspiration Photos", icon: Lightbulb, accept: "image/*", capture: "environment" },
  { key: "before_photos",     label: "Before / Measure Photos", icon: Camera, accept: "image/*", capture: "environment" },
  { key: "house_plans",       label: "House Plans", icon: FileText, accept: "*" },
  { key: "cut_list",          label: "Cut List", icon: Ruler, accept: "*" },
  { key: "after_photos",      label: "After / Install Photos", icon: FileImage, accept: "image/*", capture: "environment" },
  { key: "misc",              label: "Miscellaneous", icon: Paperclip, accept: "*" },
];

const ICON_MAP = {
  inspiration_photos: Lightbulb,
  before_photos: Camera,
  house_plans: FileText,
  cut_list: Ruler,
  after_photos: FileImage,
  misc: Paperclip,
};

const CAT_COLORS = {
  inspiration_photos: "bg-violet-100 text-violet-700 border-violet-200",
  before_photos:     "bg-blue-100 text-blue-700 border-blue-200",
  house_plans:       "bg-slate-100 text-slate-700 border-slate-200",
  cut_list:          "bg-amber-100 text-amber-700 border-amber-200",
  after_photos:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  misc:              "bg-rose-100 text-rose-700 border-rose-200",
};

// ── File row (used inside category groups) ────────────────────────────────────
function FileRow({ file, onRemove, onRecategorize }) {
  const isImage = file.file_type?.startsWith("image/");

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/20 transition-colors group">
      {isImage ? (
        <img src={file.file_url} alt={file.file_name} className="w-10 h-10 object-cover rounded-md shrink-0 shadow-sm" />
      ) : (
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
          {file.file_type?.includes("pdf") ? (
            <FileText className="w-5 h-5 text-red-400" />
          ) : (
            <File className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.file_name}</p>
        {file.uploaded_at && (
          <p className="text-[11px] text-muted-foreground">
            {new Date(file.uploaded_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={file.file_url}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Open file"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        {onRecategorize && (
          <button
            onClick={() => onRecategorize(file)}
            className="p-1.5 rounded-md hover:bg-blue-100 text-muted-foreground hover:text-blue-600 transition-colors"
            title="Move to different category"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(file)}
            className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
            title="Delete file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Upload dialog ─────────────────────────────────────────────────────────────
function UploadDialog({ open, onClose, onUploaded }) {
  const [step, setStep] = useState("category"); // "category" | "upload"
  const [selectedCat, setSelectedCat] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const catDef = CATEGORIES.find(c => c.key === selectedCat);

  function resetState() {
    setStep("category");
    setSelectedCat(null);
    setFiles([]);
    setUploading(false);
    setError(null);
  }

  function handleClose() {
    if (uploading) return;
    resetState();
    onClose();
  }

  function pickCategory(key) {
    setSelectedCat(key);
    setStep("upload");
    setFiles([]);
    setError(null);
    // Auto-open file picker on mobile after a tiny delay for the step to render
    setTimeout(() => fileInputRef.current?.click(), 150);
  }

  function handleFilesSelected(e) {
    const selected = Array.from(e.target.files || []);
    if (selected.length) {
      setFiles(prev => [...prev, ...selected]);
    }
    e.target.value = "";
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (!files.length || !selectedCat) return;

    setUploading(true);
    setError(null);

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({
          file_url,
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          uploaded_at: new Date().toISOString(),
        });
      } catch (err) {
        failed.push(file.name);
      }
    }

    if (failed.length > 0 && uploaded.length === 0) {
      setError(`Upload failed for all ${failed.length} file(s)`);
      setUploading(false);
      return;
    }

    if (uploaded.length > 0) {
      await onUploaded(selectedCat, uploaded);
    }

    setUploading(false);

    if (failed.length > 0) {
      toast.warning(`${uploaded.length} file(s) uploaded, ${failed.length} failed`);
    }
    if (uploaded.length > 0) {
      toast.success(`${uploaded.length} file(s) added to ${catDef?.label || selectedCat}`);
    }

    resetState();
    onClose();
  }

  function goBack() {
    if (uploading) return;
    setStep("category");
    setSelectedCat(null);
    setFiles([]);
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "category" ? "Upload File" : `Upload to ${catDef?.label || ""}`}
          </DialogTitle>
          <DialogDescription>
            {step === "category"
              ? "First, choose where this file belongs."
              : `Select one or more files to upload.`}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Choose category */}
        {step === "category" && (
          <div className="grid gap-2 py-2">
            {CATEGORIES.map(cat => {
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => pickCategory(cat.key)}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/60 transition-colors text-left group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                    <CatIcon className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium flex-1">{cat.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Choose files & upload */}
        {step === "upload" && (
          <div className="space-y-4 py-2">
            {/* File input (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept={catDef?.accept || "*"}
              multiple
              capture={catDef?.capture || undefined}
              className="hidden"
              onChange={handleFilesSelected}
            />

            {/* Add more files button + selected files list */}
            <div className="space-y-2">
              {files.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                      {f.type?.startsWith("image/") ? (
                        <Image className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : f.type?.includes("pdf") ? (
                        <FileText className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate flex-1">{f.name}</span>
                      <button
                        disabled={uploading}
                        onClick={() => removeFile(i)}
                        className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4" />
                {files.length ? "Add More Files" : "Choose File(s)"}
              </Button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={goBack} disabled={uploading}>
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!files.length || uploading}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload {files.length ? `(${files.length})` : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Recategorize dialog ───────────────────────────────────────────────────────
function RecategorizeDialog({ open, onClose, file, currentCategory, onRecategorize }) {
  const available = CATEGORIES.filter(c => c.key !== currentCategory);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move File</DialogTitle>
          <DialogDescription>
            Move "{file?.file_name}" to a different category.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {available.map(cat => {
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => { onRecategorize(cat.key); onClose(); }}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/60 transition-colors text-left cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <CatIcon className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{cat.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function JobAttachmentsNew({ job }) {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [recatOpen, setRecatOpen] = useState(false);
  const [recatTarget, setRecatTarget] = useState({ file: null, fromCat: null });

  // Files stored in job.job_level_data.uploaded_files per category
  const uploadedFiles = job.job_level_data?.uploaded_files || {};

  async function saveFiles(updated) {
    await base44.entities.Job.update(job.id, {
      job_level_data: {
        ...(job.job_level_data || {}),
        uploaded_files: updated,
      },
    });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  }

  async function handleUploaded(categoryKey, newFiles) {
    const existing = uploadedFiles[categoryKey] || [];
    const updated = {
      ...uploadedFiles,
      [categoryKey]: [...existing, ...newFiles],
    };
    await saveFiles(updated);
  }

  async function handleRemoveFile(categoryKey, fileToRemove) {
    const existing = uploadedFiles[categoryKey] || [];
    const filtered = existing.filter(f => f.file_url !== fileToRemove.file_url);
    const updated = { ...uploadedFiles };

    if (filtered.length === 0) {
      delete updated[categoryKey];
    } else {
      updated[categoryKey] = filtered;
    }

    await saveFiles(updated);
    toast.success("File removed");
  }

  async function handleRecategorize(fromCat, fileToMove) {
    setRecatTarget({ file: fileToMove, fromCat });
    setRecatOpen(true);
  }

  async function doRecategorize(toCat) {
    const { file, fromCat } = recatTarget;
    // Remove from source
    const fromFiles = (uploadedFiles[fromCat] || []).filter(f => f.file_url !== file.file_url);
    const updated = { ...uploadedFiles };

    if (fromFiles.length === 0) {
      delete updated[fromCat];
    } else {
      updated[fromCat] = fromFiles;
    }

    // Add to destination
    const toFiles = updated[toCat] || [];
    updated[toCat] = [...toFiles, file];

    await saveFiles(updated);
    toast.success(`Moved to ${CATEGORIES.find(c => c.key === toCat)?.label || toCat}`);
    setRecatTarget({ file: null, fromCat: null });
  }

  // Count total files for the header
  const totalFiles = Object.values(uploadedFiles).reduce((sum, arr) => sum + arr.length, 0);

  // Build category groups that have files
  const grouped = CATEGORIES
    .filter(cat => uploadedFiles[cat.key]?.length > 0)
    .map(cat => ({
      ...cat,
      files: uploadedFiles[cat.key],
    }));

  // Also show categories from old data (migration safety)
  const existingCatKeys = Object.keys(uploadedFiles);
  const extraCats = existingCatKeys
    .filter(k => !CATEGORIES.find(c => c.key === k) && uploadedFiles[k]?.length > 0)
    .map(k => ({ key: k, label: k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), icon: Paperclip, files: uploadedFiles[k] }));

  const allGroups = [...grouped, ...extraCats];

  return (
    <div className="space-y-6">
      {/* Header with upload button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Job Files</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalFiles} file{totalFiles !== 1 ? "s" : ""} across {allGroups.length} categor{allGroups.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2 h-9"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="w-4 h-4" />
          Upload File
        </Button>
      </div>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />

      {/* Recategorize dialog */}
      <RecategorizeDialog
        open={recatOpen}
        onClose={() => setRecatOpen(false)}
        file={recatTarget.file}
        currentCategory={recatTarget.fromCat}
        onRecategorize={doRecategorize}
      />

      {/* Empty state */}
      {allGroups.length === 0 ? (
        <div className="border-2 border-dashed rounded-2xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">No files uploaded yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Upload photos, plans, cut lists, and other job documents
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
        </div>
      ) : (
        /* Category groups */
        <div className="space-y-5">
          {allGroups.map(group => {
            const CatIcon = ICON_MAP[group.key] || Paperclip;
            return (
              <div key={group.key}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${CAT_COLORS[group.key] || "bg-muted text-muted-foreground border-border"}`}>
                    <CatIcon className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </h4>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    {group.files.length}
                  </Badge>
                </div>

                {/* File rows */}
                <div className="space-y-1.5">
                  {group.files.map((file, i) => (
                    <FileRow
                      key={i}
                      file={file}
                      onRemove={(f) => handleRemoveFile(group.key, f)}
                      onRecategorize={(f) => handleRecategorize(group.key, f)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}