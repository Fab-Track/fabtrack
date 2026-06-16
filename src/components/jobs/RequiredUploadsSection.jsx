import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  CheckCircle2, AlertTriangle, Upload, FileImage, FileText, Ruler,
  Camera, Lightbulb, X, ExternalLink, Loader2, Trash2,
} from "lucide-react";

const REQUIRED_SECTIONS = [
  { key: "before_photos", label: "Before / Measure Photos", description: "Measure visit photos before fabrication", icon: Camera, accept: "image/*", capture: "environment", multiple: true },
  { key: "house_plans", label: "House Plans", description: "Architectural or site drawings", icon: FileText, accept: "*" },
  { key: "cut_list", label: "Cut List", description: "Material cut list for fabrication", icon: Ruler, accept: "*" },
  { key: "after_photos", label: "After / Install Photos", description: "Install completion photos", icon: FileImage, accept: "image/*", capture: "environment", multiple: true },
];

const INSPIRATION_SECTION = {
  key: "inspiration_photos", label: "Inspiration Photos", description: "Reference or style inspiration images",
  icon: Lightbulb, accept: "image/*", multiple: true,
};

// ── Upload card for a single section ──────────────────────────────────────────
function RequiredUploadCard({ sectionDef, files = [], bypassed = false, onUpload, onBypass, onRemoveFile, uploading, uploadError }) {
  const [naChecked, setNaChecked] = useState(false);
  const fileInputRef = useRef(null);
  const Icon = sectionDef.icon;
  const hasFiles = files.length > 0;
  const isMulti = !!sectionDef.multiple;

  let statusEl;
  if (uploading) {
    statusEl = (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Uploading…
      </span>
    );
  } else if (hasFiles) {
    statusEl = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {files.length} file{files.length !== 1 ? "s" : ""}
      </span>
    );
  } else if (bypassed) {
    statusEl = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
        N/A — Acknowledged
      </span>
    );
  } else {
    statusEl = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300">
        <AlertTriangle className="w-3.5 h-3.5" />
        Required
      </span>
    );
  }

  const borderCls = hasFiles || uploading
    ? "border-emerald-200 bg-emerald-50/30"
    : bypassed
    ? "border-slate-200 bg-slate-50/40"
    : "border-amber-200 bg-amber-50/20";

  return (
    <div className={`rounded-xl border-2 p-4 transition-colors ${borderCls}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasFiles ? "bg-emerald-100" : bypassed ? "bg-slate-100" : "bg-amber-100"}`}>
            <Icon className={`w-4 h-4 ${hasFiles ? "text-emerald-600" : bypassed ? "text-slate-400" : "text-amber-600"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{sectionDef.label}</p>
            <p className="text-xs text-muted-foreground">{sectionDef.description}</p>
          </div>
        </div>
        {statusEl}
      </div>

      {/* Error banner */}
      {uploadError && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* File list */}
      {hasFiles && (
        <div className="space-y-1 mb-3">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-white/80 rounded-md pl-2.5 pr-1 py-1.5 border border-emerald-100 group">
              {f.file_type?.startsWith("image/") ? (
                <img src={f.file_url} alt={f.file_name} className="w-8 h-8 object-cover rounded shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className="truncate flex-1 text-foreground font-medium">{f.file_name}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded hover:bg-emerald-100 text-muted-foreground hover:text-foreground transition-colors"
                  title="View file"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => onRemoveFile(sectionDef.key, i)}
                  className="p-1.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button — always show if not bypassed */}
      {!bypassed && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={sectionDef.accept}
            multiple={isMulti}
            capture={sectionDef.capture || undefined}
            className="hidden"
            disabled={uploading}
            onChange={onUpload}
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium border rounded-md px-3 py-1.5 hover:bg-white/80 transition-colors bg-white/60 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                {hasFiles ? "Upload More" : "Upload File"}
              </>
            )}
          </button>
        </>
      )}

      {/* N/A bypass */}
      {!hasFiles && !bypassed && !uploading && (
        <div className="mt-3 pt-3 border-t border-dashed border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox id={`na-${sectionDef.key}`} checked={naChecked} onCheckedChange={setNaChecked} />
            <label htmlFor={`na-${sectionDef.key}`} className="text-xs text-muted-foreground cursor-pointer select-none">
              This item does not apply to this job
            </label>
          </div>
          {naChecked && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-slate-300" onClick={() => onBypass(sectionDef.key)}>
              Confirm — Mark as N/A
            </Button>
          )}
        </div>
      )}

      {/* Un-bypass link */}
      {bypassed && (
        <button className="text-xs text-muted-foreground hover:text-foreground underline mt-1" onClick={() => onBypass(sectionDef.key, true)}>
          Undo — upload files instead
        </button>
      )}
    </div>
  );
}

// ── Parent section ─────────────────────────────────────────────────────────────
export default function RequiredUploadsSection({ job }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState({});
  const [errors, setErrors] = useState({});

  const requiredData = job.job_level_data?.required_uploads || {};

  async function saveRequiredData(updated) {
    await base44.entities.Job.update(job.id, {
      job_level_data: {
        ...(job.job_level_data || {}),
        required_uploads: updated,
      },
    });
    qc.invalidateQueries({ queryKey: ["job", job.id] });
  }

  async function handleUpload(e, sectionKey) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const sectionLabel = [...REQUIRED_SECTIONS, INSPIRATION_SECTION].find(s => s.key === sectionKey)?.label || sectionKey;

    setUploading(u => ({ ...u, [sectionKey]: true }));
    setErrors(e => ({ ...e, [sectionKey]: null }));

    const uploaded = [];
    const failed = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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

    // Show partial-success or full-failure feedback
    if (failed.length > 0 && uploaded.length === 0) {
      setErrors(e => ({ ...e, [sectionKey]: `Upload failed: ${failed.join(", ")}` }));
      toast.error(`Failed to upload ${failed.length} file${failed.length !== 1 ? "s" : ""}`);
    } else if (failed.length > 0) {
      toast.warning(`${uploaded.length} uploaded, ${failed.length} failed`);
    }

    if (uploaded.length > 0) {
      const existing = requiredData[sectionKey]?.files || [];
      const updated = {
        ...requiredData,
        [sectionKey]: {
          ...requiredData[sectionKey],
          files: [...existing, ...uploaded],
          bypassed: false,
        },
      };
      await saveRequiredData(updated);
      toast.success(`${uploaded.length} file${uploaded.length !== 1 ? "s" : ""} uploaded to ${sectionLabel}`);
    }

    setUploading(u => ({ ...u, [sectionKey]: false }));
    e.target.value = "";
  }

  async function handleRemoveFile(sectionKey, fileIndex) {
    const existing = requiredData[sectionKey]?.files || [];
    const updated = {
      ...requiredData,
      [sectionKey]: {
        ...requiredData[sectionKey],
        files: existing.filter((_, i) => i !== fileIndex),
      },
    };
    await saveRequiredData(updated);
    toast.success("File removed");
  }

  async function handleBypass(sectionKey, undo = false) {
    const updated = {
      ...requiredData,
      [sectionKey]: {
        ...(requiredData[sectionKey] || {}),
        bypassed: !undo,
      },
    };
    await saveRequiredData(updated);
  }

  // ── All sections including inspiration ──
  const allSections = [...REQUIRED_SECTIONS, INSPIRATION_SECTION];
  const requiredOnly = REQUIRED_SECTIONS;

  const completedCount = requiredOnly.filter(s => {
    const d = requiredData[s.key];
    return (d?.files?.length > 0) || d?.bypassed;
  }).length;
  const allDone = completedCount === requiredOnly.length;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Required Documents &amp; Photos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {requiredOnly.length} completed
          </p>
        </div>
        {allDone ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" /> {requiredOnly.length - completedCount} Remaining
          </span>
        )}
      </div>

      {/* Inspiration Photos — full-width row above required docs */}
      <div className="mb-3">
        <RequiredUploadCard
          sectionDef={INSPIRATION_SECTION}
          files={requiredData[INSPIRATION_SECTION.key]?.files || []}
          bypassed={!!requiredData[INSPIRATION_SECTION.key]?.bypassed}
          uploading={!!uploading[INSPIRATION_SECTION.key]}
          uploadError={errors[INSPIRATION_SECTION.key]}
          onUpload={e => handleUpload(e, INSPIRATION_SECTION.key)}
          onBypass={handleBypass}
          onRemoveFile={handleRemoveFile}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {requiredOnly.map(section => (
          <RequiredUploadCard
            key={section.key}
            sectionDef={section}
            files={requiredData[section.key]?.files || []}
            bypassed={!!requiredData[section.key]?.bypassed}
            uploading={!!uploading[section.key]}
            uploadError={errors[section.key]}
            onUpload={e => handleUpload(e, section.key)}
            onBypass={handleBypass}
            onRemoveFile={handleRemoveFile}
          />
        ))}
      </div>

      <div className="border-t border-dashed mt-5 mb-1" />
    </div>
  );
}