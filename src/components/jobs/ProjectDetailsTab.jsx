import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import JobLevelSections from "@/components/jobs/JobLevelSections";
import { useToast } from "@/components/ui/use-toast";

function getViewFilter(role) {
  const r = (role || "").toLowerCase();
  if (r === "fabricator" || r === "installer") return "installer";
  if (r === "design_specialist") return "designer";
  return "all";
}

export default function ProjectDetailsTab({ job, userRole }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [jobLevelData, setJobLevelData] = useState(job.job_level_data || {});
  const viewFilter = getViewFilter(userRole);
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Job.update(job.id, { job_level_data: jobLevelData }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      setDirty(false);
      toast({ title: "Project details saved" });
    },
  });

  const updateJobLevel = useCallback((section, val) => {
    setJobLevelData(prev => ({ ...prev, [section]: val }));
    setDirty(true);
  }, []);

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

      {/* Job-level sections */}
      <JobLevelSections
        job={job}
        data={jobLevelData}
        onChangeField={updateJobLevel}
        viewFilter={viewFilter}
      />
    </div>
  );
}