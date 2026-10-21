import React, { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useJobDetailConfig } from "@/hooks/useJobDetailConfig";
import ProductDetailsSection from "@/components/jobs/ProductDetailsSection";
import InstallDetailsSection from "@/components/jobs/InstallDetailsSection";
import SiteAccessSection from "@/components/jobs/SiteAccessSection";
import JobNotesSection from "@/components/jobs/JobNotesSection";
import CollapsibleSection from "@/components/jobs/CollapsibleSection";
import { StickyNote } from "lucide-react";

const AUTOSAVE_DELAY_MS = 1500;

export default function ProjectDetailsTab({ job }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { config, isLoading } = useJobDetailConfig();
  const [data, setData] = useState(job.job_level_data || {});
  const [dirty, setDirty] = useState(false);
  const autosaveTimer = useRef(null);

  const saveMutation = useMutation({
    mutationFn: (dataToSave) => base44.entities.Job.update(job.id, { job_level_data: dataToSave }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      setDirty(false);
    },
  });

  const updateSection = useCallback((section, val) => {
    setData(prev => ({ ...prev, [section]: val }));
    setDirty(true);
  }, []);

  // When a surface type is selected on a product, add it to install_details.surfaces
  // without duplicating existing entries.
  const syncSurfaceToInstallDetails = useCallback((surface) => {
    if (!surface) return;
    setData(prev => {
      const installDetails = prev.install_details || {};
      const currentSurfaces = installDetails.surfaces || [];
      if (currentSurfaces.includes(surface)) return prev;
      return {
        ...prev,
        install_details: { ...installDetails, surfaces: [...currentSurfaces, surface] },
      };
    });
    setDirty(true);
  }, []);

  // When a photo/file is uploaded on a product, also create a JobAttachment
  // record so it appears in the Attachments gallery for this job.
  const handleProductFileUploaded = useCallback(async (fileUri, fileName, fileType) => {
    try {
      await base44.entities.JobAttachment.create({
        job_id: job.id,
        job_number: job.job_number,
        organization_id: job.organization_id,
        category: "Product Photos",
        file_url: fileUri,
        file_name: fileName,
        file_type: fileType,
        uploaded_by: "me",
      });
      qc.invalidateQueries({ queryKey: ["attachments", job.id] });
    } catch (err) {
      // Silently fail — the file is still saved on the product entry
    }
  }, [job, qc]);

  useEffect(() => {
    if (!dirty) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveMutation.mutate(data);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(autosaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dirty]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {saveMutation.isPending ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
          </span>
        ) : dirty ? (
          <Button
            size="sm"
            onClick={() => {
              if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
              saveMutation.mutate(data);
            }}
            className="h-8 gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <ProductDetailsSection
        entries={data.product_details || []}
        config={config}
        onChange={(val) => updateSection("product_details", val)}
        onSurfaceSync={syncSurfaceToInstallDetails}
        onFileUploaded={handleProductFileUploaded}
        jobId={job.id}
      />
      <InstallDetailsSection
        data={data.install_details || {}}
        config={config}
        onChange={(val) => updateSection("install_details", val)}
      />
      <SiteAccessSection
        data={data.site_access || {}}
        onChange={(val) => updateSection("site_access", val)}
      />
      <CollapsibleSection title="Notes" icon={StickyNote}>
        <JobNotesSection job={job} />
      </CollapsibleSection>
    </div>
  );
}