import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertTriangle, Upload, FileImage, FileText, Ruler, Camera, X } from "lucide-react";

const REQUIRED_SECTIONS = [
  {
    key: "house_plans",
    label: "House Plans",
    description: "Architectural or site drawings",
    icon: FileText,
    accept: "*",
  },
  {
    key: "cut_list",
    label: "Cut List",
    description: "Material cut list for fabrication",
    icon: Ruler,
    accept: "*",
  },
  {
    key: "before_photos",
    label: "Before / Measure Photos",
    description: "Measure visit photos before fabrication",
    icon: Camera,
    accept: "image/*",
    multiple: true,
  },
  {
    key: "after_photos",
    label: "After / Install Photos",
    description: "Install completion photos",
    icon: FileImage,
    accept: "image/*",
    multiple: true,
  },
];

function RequiredUploadCard({ sectionDef, files = [], bypassed = false, onUpload, onBypass, uploading }) {
  const [naChecked, setNaChecked] = useState(false);
  const Icon = sectionDef.icon;
  const hasFiles = files.length > 0;

  let statusEl;
  if (hasFiles) {
    statusEl = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {files.length} file{files.length !== 1 ? "s" : ""} uploaded
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

  // Border color
  const borderCls = hasFiles
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

      {/* File list */}
      {hasFiles && (
        <div className="space-y-1 mb-3">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-white/80 rounded-md px-2.5 py-1.5 border border-emerald-100">
              {f.file_type?.startsWith("image/") ? (
                <img src={f.file_url} alt="" className="w-6 h-6 object-cover rounded" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate flex-1 text-foreground font-medium">{f.file_name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload button — always show if not bypassed */}
      {!bypassed && (
        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium border rounded-md px-3 py-1.5 hover:bg-white/80 transition-colors bg-white/60 shadow-sm">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploading…" : hasFiles ? "Upload More" : "Upload File"}
          <input
            type="file"
            accept={sectionDef.accept}
            multiple={!!sectionDef.multiple}
            className="hidden"
            disabled={uploading}
            onChange={onUpload}
          />
        </label>
      )}

      {/* N/A bypass */}
      {!hasFiles && !bypassed && (
        <div className="mt-3 pt-3 border-t border-dashed border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id={`na-${sectionDef.key}`}
              checked={naChecked}
              onCheckedChange={setNaChecked}
            />
            <label htmlFor={`na-${sectionDef.key}`} className="text-xs text-muted-foreground cursor-pointer select-none">
              This item does not apply to this job
            </label>
          </div>
          {naChecked && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-slate-300"
              onClick={() => onBypass(sectionDef.key)}
            >
              Confirm — Mark as N/A
            </Button>
          )}
        </div>
      )}

      {/* Un-bypass link */}
      {bypassed && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
          onClick={() => onBypass(sectionDef.key, true)}
        >
          Undo — upload files instead
        </button>
      )}
    </div>
  );
}

export default function RequiredUploadsSection({ job }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState({});

  // required_uploads stored in job.job_level_data.required_uploads
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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(u => ({ ...u, [sectionKey]: true }));
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ file_url, file_name: file.name, file_type: file.type, uploaded_at: new Date().toISOString() });
    }
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
    setUploading(u => ({ ...u, [sectionKey]: false }));
    e.target.value = "";
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

  const completedCount = REQUIRED_SECTIONS.filter(s => {
    const d = requiredData[s.key];
    return (d?.files?.length > 0) || d?.bypassed;
  }).length;

  const allDone = completedCount === REQUIRED_SECTIONS.length;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Required Documents &amp; Photos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {REQUIRED_SECTIONS.length} completed
          </p>
        </div>
        {allDone ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Complete
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" /> {REQUIRED_SECTIONS.length - completedCount} Remaining
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REQUIRED_SECTIONS.map(section => {
          const d = requiredData[section.key] || {};
          return (
            <RequiredUploadCard
              key={section.key}
              sectionDef={section}
              files={d.files || []}
              bypassed={!!d.bypassed}
              uploading={!!uploading[section.key]}
              onUpload={e => handleUpload(e, section.key)}
              onBypass={handleBypass}
            />
          );
        })}
      </div>

      <div className="border-t border-dashed mt-5 mb-1" />
    </div>
  );
}