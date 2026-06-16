import React, { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, Paperclip, Image, File, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import AttachmentCategoryGroup from "./AttachmentCategoryGroup";

export default function JobAttachmentsTab({ job }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: "success"|"error", message }
  const dropZoneRef = useRef(null);

  // Fetch categories from manageable entity
  const { data: categories = [] } = useQuery({
    queryKey: ["attachment-categories"],
    queryFn: () => base44.entities.AttachmentCategory.filter({ is_active: true }, "sort_order", 50),
    staleTime: 60000,
  });

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", job.id],
    queryFn: () => base44.entities.JobAttachment.filter({ job_id: job.id }),
    enabled: !!job.id,
  });

  const activeCategories = categories.length > 0
    ? categories
    : DEFAULT_CATEGORIES;

  // Pick file(s) — category must be selected first
  const triggerFilePick = () => {
    if (!selectedCategory) {
      setUploadStatus({ type: "error", message: "Please select a category first." });
      setTimeout(() => setUploadStatus(null), 3000);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFiles = useCallback(async (fileList) => {
    if (!selectedCategory) {
      setUploadStatus({ type: "error", message: "Please select a category first." });
      setTimeout(() => setUploadStatus(null), 3000);
      return;
    }
    if (!fileList || fileList.length === 0) return;

    const cat = activeCategories.find(c => c.name === selectedCategory);
    const usesVersioning = cat?.uses_versioning || false;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    const total = fileList.length;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < total; i++) {
      const file = fileList[i];
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const fileName = file.name;

        let versionLabel = "v1";
        let versionGroup = fileName.replace(/\.[^/.]+$/, ""); // strip extension

        if (usesVersioning) {
          // Check for existing versions in this category for this job
          const existing = attachments.filter(
            a => a.category === selectedCategory && a.version_group === versionGroup
          );
          if (existing.length > 0) {
            const nextV = existing.length + 1;
            versionLabel = `v${nextV}`;
          }
        }

        await base44.entities.JobAttachment.create({
          job_id: job.id,
          job_number: job.job_number,
          category: selectedCategory,
          file_url,
          file_name: fileName,
          file_type: file.type || "application/octet-stream",
          version: versionLabel,
          version_group: versionGroup,
          uploaded_by: "me",
        });
        succeeded++;
      } catch (err) {
        failed++;
      }
      setUploadProgress(Math.round(((i + 1) / total) * 100));
    }

    qc.invalidateQueries({ queryKey: ["attachments", job.id] });

    if (failed === 0) {
      setUploadStatus({
        type: "success",
        message: `${succeeded} file${succeeded !== 1 ? "s" : ""} uploaded to "${selectedCategory}"`,
      });
    } else {
      setUploadStatus({
        type: "error",
        message: `${succeeded} uploaded, ${failed} failed`,
      });
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setUploadStatus(null), 4000);
  }, [selectedCategory, activeCategories, attachments, job, qc]);

  // Drag-and-drop handlers
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // Mobile: accept camera capture
  const acceptTypes = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.dwg,.dxf,.heic,.heif,.zip";

  // Count stats
  const categoryCount = new Set(attachments.map(a => a.category)).size;

  // Group attachments by category, respecting active category sort order
  const grouped = {};
  attachments.forEach(a => {
    const cat = a.category || "Miscellaneous";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  // Sort categories by order from activeCategories
  const sortedCategoryNames = activeCategories
    .filter(c => grouped[c.name]?.length > 0)
    .map(c => c.name);

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          <strong>{attachments.length}</strong> file{attachments.length !== 1 ? "s" : ""} across{" "}
          <strong>{categoryCount}</strong> categor{categoryCount !== 1 ? "ies" : "y"}
        </p>
      </div>

      {/* Upload area */}
      <div className="space-y-3">
        {/* Category selector */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Category:</span>
          <div className="flex flex-wrap gap-1.5">
            {activeCategories.map(cat => (
              <button
                key={cat.name}
                onClick={() => { setSelectedCategory(cat.name); setUploadStatus(null); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedCategory === cat.name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone + upload button */}
        <div
          ref={dropZoneRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : selectedCategory
                ? "border-border hover:border-primary/40 bg-muted/20"
                : "border-muted-foreground/20 bg-muted/10"
          }`}
          onClick={triggerFilePick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptTypes}
            multiple
            capture="environment"
            onChange={e => handleFiles(e.target.files)}
          />

          {uploading ? (
            <div className="space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium">Uploading to "{selectedCategory}"…</p>
              <Progress value={uploadProgress} className="max-w-xs mx-auto h-2" />
              <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
            </div>
          ) : (
            <>
              {uploadStatus ? (
                <div className="space-y-2">
                  {uploadStatus.type === "success" ? (
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
                  )}
                  <p className={`text-sm font-medium ${uploadStatus.type === "success" ? "text-success" : "text-destructive"}`}>
                    {uploadStatus.message}
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium">
                    {selectedCategory
                      ? `Drop files here or tap to upload to "${selectedCategory}"`
                      : "Select a category above first, then upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Images, PDFs, documents — tap for camera on mobile
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* File list by category */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-10 text-center">
          <Paperclip className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No files attached yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Select a category and upload or drop files above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCategoryNames.map(catName => {
            const files = grouped[catName];
            const cat = activeCategories.find(c => c.name === catName);
            return (
              <AttachmentCategoryGroup
                key={catName}
                categoryName={catName}
                files={files}
                usesVersioning={cat?.uses_versioning || false}
                jobId={job.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Fallback default categories — used until admin sets up custom ones in Settings
const DEFAULT_CATEGORIES = [
  { name: "Inspiration Photos", sort_order: 10, uses_versioning: false, is_active: true },
  { name: "Before / Measure Photos", sort_order: 20, uses_versioning: false, is_active: true },
  { name: "House Plans", sort_order: 30, uses_versioning: true, is_active: true },
  { name: "Cut List", sort_order: 40, uses_versioning: true, is_active: true },
  { name: "After / Install Photos", sort_order: 50, uses_versioning: false, is_active: true },
  { name: "Miscellaneous", sort_order: 99, uses_versioning: false, is_active: true },
];