import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronUp, ChevronDown, Plus, Trash2, Save, Loader2, ListChecks } from "lucide-react";
import { useJobDetailConfig } from "@/hooks/useJobDetailConfig";
import { JOB_DETAIL_DEFAULTS } from "@/lib/jobDetailDefaults";
import { useToast } from "@/components/ui/use-toast";

const LIST_META = [
  { key: "products", label: "Product", defaults: JOB_DETAIL_DEFAULTS.products },
  { key: "railing_styles", label: "Railing Style", defaults: JOB_DETAIL_DEFAULTS.railing_styles },
  { key: "powdercoat_colors", label: "Powdercoat Color", defaults: JOB_DETAIL_DEFAULTS.powdercoat_colors },
  { key: "stair_styles", label: "Stair Style", defaults: JOB_DETAIL_DEFAULTS.stair_styles },
  { key: "stair_materials", label: "Stair Material", defaults: JOB_DETAIL_DEFAULTS.stair_materials },
  { key: "stair_tread_materials", label: "Stair Tread Material", defaults: JOB_DETAIL_DEFAULTS.stair_tread_materials },
  { key: "surfaces", label: "Surface", defaults: JOB_DETAIL_DEFAULTS.surfaces },
];

function OptionListEditor({ label, items, onChange }) {
  const [newVal, setNewVal] = useState("");

  const add = () => {
    const trimmed = newVal.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setNewVal("");
  };

  const edit = (idx, val) => {
    onChange(items.map((it, i) => i === idx ? val : it));
  };

  const remove = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const move = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    onChange(copy);
  };

  return (
    <div className="rounded-lg border p-4">
      <h4 className="text-sm font-semibold mb-3">{label}</h4>
      <div className="space-y-1.5 mb-3">
        {items.length === 0 && <p className="text-xs text-muted-foreground">No options — add one below.</p>}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              className="h-8 text-xs flex-1"
              value={item}
              onChange={e => edit(i, e.target.value)}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down">
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => remove(i)} title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          className="h-8 text-xs flex-1"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={`Add new ${label.toLowerCase()} option...`}
        />
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={add} disabled={!newVal.trim()}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

export default function JobDetailOptionsSection() {
  const { user } = useAuth();
  const { config, configId, isLoading } = useJobDetailConfig();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [lists, setLists] = useState(null);

  useEffect(() => {
    if (!isLoading) {
      setLists({
        products: [...config.products],
        railing_styles: [...config.railing_styles],
        powdercoat_colors: [...config.powdercoat_colors],
        stair_styles: [...config.stair_styles],
        stair_materials: [...config.stair_materials],
        stair_tread_materials: [...config.stair_tread_materials],
        surfaces: [...config.surfaces],
      });
    }
  }, [isLoading, config]);

  const dirty = lists && config && LIST_META.some(m => JSON.stringify(lists[m.key]) !== JSON.stringify(config[m.key]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (configId) {
        return base44.entities.JobDetailConfig.update(configId, lists);
      }
      return base44.entities.JobDetailConfig.create({ organization_id: user.organization_id, ...lists });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobDetailConfig"] });
      toast({ title: "Job detail options saved" });
    },
  });

  if (isLoading || !lists) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Manage Job Detail Options</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the dropdown options shown on the Job Details tab. Changes apply to all jobs in your organization.
        </p>
      </div>

      <div className="flex justify-end">
        {dirty && (
          <Button size="sm" className="gap-1.5" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {LIST_META.map(meta => (
          <OptionListEditor
            key={meta.key}
            label={meta.label}
            items={lists[meta.key]}
            onChange={(newItems) => setLists(prev => ({ ...prev, [meta.key]: newItems }))}
          />
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Conditional fields (Railing Style, Stair fields) are triggered by exact string matches
          "Railing" and "Staircase" in your Product list. If you rename those options, the conditional fields will stop
          appearing until the original names are restored.
        </p>
      </div>
    </div>
  );
}