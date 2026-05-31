import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_SALES = ["New Lead", "Estimate Sent", "Awaiting Approval", "Awaiting Deposit", "Deposit Received"];
const DEFAULT_PRODUCTION = ["In Fabrication", "At Powder Coat", "Ready for Install", "Install Scheduled", "Install Complete", "Closed"];

const COLORS = ["#94a3b8", "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#fb923c", "#38bdf8"];

function StageRow({ stage, onRename, onDelete, onColorChange }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg group">
      <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
      <div className="relative">
        <input
          type="color"
          value={stage.color || "#94a3b8"}
          onChange={e => onColorChange(e.target.value)}
          className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
          title="Stage color"
        />
      </div>
      <Input
        className="h-7 text-sm flex-1 border-transparent bg-transparent focus:border-input focus:bg-background px-0"
        value={stage.name}
        onChange={e => onRename(e.target.value)}
      />
      <Button
        size="sm" variant="ghost"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function PipelineEditor({ title, defaultStages }) {
  const [stages, setStages] = useState(() =>
    defaultStages.map((name, i) => ({ id: i + 1, name, color: COLORS[i % COLORS.length] }))
  );

  function addStage() {
    setStages(p => [...p, { id: Date.now(), name: "New Stage", color: "#94a3b8" }]);
  }

  function updateStage(id, patch) {
    setStages(p => p.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function deleteStage(id) {
    setStages(p => p.filter(s => s.id !== id));
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-1.5">
        {stages.map(s => (
          <StageRow
            key={s.id}
            stage={s}
            onRename={name => updateStage(s.id, { name })}
            onColorChange={color => updateStage(s.id, { color })}
            onDelete={() => deleteStage(s.id)}
          />
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-2 gap-1.5 h-7 text-xs" onClick={addStage}>
        <Plus className="w-3 h-3" /> Add Stage
      </Button>
    </div>
  );
}

export default function JobBoardSettingsSection() {
  const [prefix, setPrefix] = useState("HCMW");
  const [estimateExpiry, setEstimateExpiry] = useState(30);
  const [depositPct, setDepositPct] = useState(50);

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="font-semibold text-base">Job Board</h2>
        <p className="text-sm text-muted-foreground">Configure pipeline stages and job defaults.</p>
      </div>

      {/* Pipeline editors */}
      <div className="space-y-6">
        <PipelineEditor title="Sales Pipeline" defaultStages={DEFAULT_SALES} />
        <PipelineEditor title="Production Pipeline" defaultStages={DEFAULT_PRODUCTION} />
      </div>

      {/* Defaults */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-semibold text-sm">Job Defaults</h3>

        <div>
          <Label className="text-xs">Job Number Prefix</Label>
          <div className="flex items-center gap-3 mt-1">
            <Input className="h-8 w-32" value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} maxLength={8} />
            <span className="text-xs text-muted-foreground">Next: <span className="font-mono font-medium">{prefix}-{currentYear}-336</span></span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Default Estimate Expiration</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input className="h-8 w-20" type="number" min={1} max={365} value={estimateExpiry} onChange={e => setEstimateExpiry(Number(e.target.value))} />
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">Default Deposit Percentage</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input className="h-8 w-20" type="number" min={1} max={100} value={depositPct} onChange={e => setDepositPct(Number(e.target.value))} />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={() => toast.success("Job board settings saved")} className="w-full sm:w-auto">Save Changes</Button>
    </div>
  );
}