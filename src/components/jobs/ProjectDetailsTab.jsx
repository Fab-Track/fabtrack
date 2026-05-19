import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import AddProductMenu from "@/components/products/AddProductMenu";
import ProductInstanceCard from "@/components/products/ProductInstanceCard";
import JobLevelSections from "@/components/jobs/JobLevelSections";
import { useToast } from "@/components/ui/use-toast";

const VIEW_OPTIONS = ["all", "designer", "installer"];
const VIEW_LABELS = { all: "All Fields", designer: "Designer View", installer: "Installer View" };
const VIEW_COLORS = {
  all: "bg-muted text-muted-foreground",
  designer: "bg-blue-100 text-blue-700 border-blue-200",
  installer: "bg-orange-100 text-orange-700 border-orange-200",
};

function countByType(instances) {
  const counts = {};
  instances.forEach(i => {
    counts[i.product_type] = (counts[i.product_type] || 0) + 1;
  });
  return counts;
}

function makeLabel(type, counts) {
  const n = (counts[type] || 0) + 1;
  return `${type} #${n}`;
}

export default function ProjectDetailsTab({ job }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [instances, setInstances] = useState(job.product_instances || []);
  const [jobLevelData, setJobLevelData] = useState(job.job_level_data || {});
  const [viewFilter, setViewFilter] = useState("all");
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Job.update(job.id, { product_instances: instances, job_level_data: jobLevelData }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      setDirty(false);
      toast({ title: "Project details saved" });
    },
  });

  const update = useCallback((idx, updated) => {
    setInstances(prev => prev.map((inst, i) => i === idx ? updated : inst));
    setDirty(true);
  }, []);

  const updateJobLevel = useCallback((section, val) => {
    setJobLevelData(prev => ({ ...prev, [section]: val }));
    setDirty(true);
  }, []);

  const addProduct = (type) => {
    const existing = instances;
    const counts = countByType(existing);
    const label = makeLabel(type, counts);
    setInstances(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      product_type: type,
      label,
      data: {},
      photos: [],
    }]);
    setDirty(true);
  };

  const deleteProduct = (idx) => {
    setInstances(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const duplicateProduct = (idx) => {
    const source = instances[idx];
    const counts = countByType(instances);
    const label = makeLabel(source.product_type, counts);
    const copy = {
      ...source,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
    };
    setInstances(prev => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {VIEW_OPTIONS.map(v => (
            <button
              key={v}
              onClick={() => setViewFilter(v)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${viewFilter === v ? VIEW_COLORS[v] + " border-current" : "border-transparent text-muted-foreground hover:bg-muted"}`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
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
          <AddProductMenu onAdd={addProduct} />
        </div>
      </div>

      {/* Product summary pills */}
      {instances.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {instances.map((inst, i) => (
            <span
              key={inst.id}
              className="text-xs px-2.5 py-1 rounded-full border bg-muted/50 text-muted-foreground font-medium"
            >
              {inst.label}
            </span>
          ))}
        </div>
      )}

      {/* Product cards */}
      {instances.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-border">
          <p className="text-muted-foreground text-sm mb-3">No products added yet</p>
          <AddProductMenu onAdd={addProduct} />
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((inst, i) => (
            <ProductInstanceCard
              key={inst.id}
              instance={{ ...inst, job_name: job.job_name }}
              onChange={(updated) => update(i, updated)}
              onDelete={() => deleteProduct(i)}
              onDuplicate={() => duplicateProduct(i)}
              viewFilter={viewFilter}
            />
          ))}
        </div>
      )}

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