import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useJobDetailConfig } from "@/hooks/useJobDetailConfig";
import ProductDetailsSection from "@/components/jobs/ProductDetailsSection";
import InstallDetailsSection from "@/components/jobs/InstallDetailsSection";
import SiteAccessSection from "@/components/jobs/SiteAccessSection";

export default function ProjectDetailsTab({ job }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { config, isLoading } = useJobDetailConfig();
  const [data, setData] = useState(job.job_level_data || {});
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Job.update(job.id, { job_level_data: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      setDirty(false);
      toast({ title: "Project details saved" });
    },
  });

  const updateSection = useCallback((section, val) => {
    setData(prev => ({ ...prev, [section]: val }));
    setDirty(true);
  }, []);

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
        {dirty && (
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-8 gap-1.5"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </Button>
        )}
      </div>

      <ProductDetailsSection
        entries={data.product_details || []}
        config={config}
        onChange={(val) => updateSection("product_details", val)}
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
    </div>
  );
}