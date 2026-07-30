import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Trash2, Plus, Info } from "lucide-react";
import { toast } from "sonner";
import {
  SALES_STAGES, SHOP_STAGES, BILLING_STAGES,
  SALES_COLORS, SHOP_COLORS, BILLING_COLORS,
} from "@/lib/pipelineHelpers";

// Map the tailwind `border-t-<color>-<shade>` classes used in pipelineHelpers
// to a hex swatch so the color picker shows the real column color.
const TAILWIND_TO_HEX = {
  "slate-400": "#94a3b8",
  "sky-400": "#38bdf8", "sky-600": "#0284c7",
  "blue-400": "#60a5fa", "blue-600": "#2563eb",
  "violet-400": "#a78bfa", "violet-600": "#7c3aed",
  "amber-400": "#fbbf24", "amber-500": "#f59e0b", "amber-600": "#d97706",
  "orange-400": "#fb923c", "orange-500": "#f97316", "orange-600": "#ea580c",
  "cyan-500": "#06b6d4", "cyan-700": "#0e7490",
  "emerald-500": "#10b981",
  "yellow-300": "#fde047", "yellow-500": "#eab308",
  "red-500": "#ef4444", "red-800": "#991b1b",
};

function hexForColorClass(cls = "") {
  const m = cls.match(/border-t-([a-z]+)-(\d+)/);
  if (!m) return "#94a3b8";
  return TAILWIND_TO_HEX[`${m[1]}-${m[2]}`] || "#94a3b8";
}

// Build the seed list of {name, color} from a real stage array + its color map.
function stagesToSeed(stages, colorMap) {
  return stages.map((name, i) => ({
    id: i + 1,
    name,
    color: hexForColorClass(colorMap[name]),
  }));
}

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

function PipelineEditor({ title, stages, colorMap }) {
  const [stageRows, setStageRows] = useState(() => stagesToSeed(stages, colorMap));

  function addStage() {
    setStageRows(p => [...p, { id: Date.now(), name: "New Stage", color: "#94a3b8" }]);
  }

  function updateStage(id, patch) {
    setStageRows(p => p.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function deleteStage(id) {
    setStageRows(p => p.filter(s => s.id !== id));
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-1.5">
        {stageRows.map(s => (
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
  const [prefix, setPrefix] = useState("");
  const [estimateExpiry, setEstimateExpiry] = useState(30);
  const [depositPct, setDepositPct] = useState(50);

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="font-semibold text-base">Job Board</h2>
        <p className="text-sm text-muted-foreground">Configure pipeline stages and job defaults.</p>
      </div>

      {/* Pipeline editors — seeded from the live stage definitions in pipelineHelpers */}
      <div className="space-y-6">
        <PipelineEditor title="Sales Pipeline" stages={SALES_STAGES} colorMap={SALES_COLORS} />
        <PipelineEditor title="Shop Pipeline" stages={SHOP_STAGES} colorMap={SHOP_COLORS} />
        <PipelineEditor title="Billing Pipeline" stages={BILLING_STAGES} colorMap={BILLING_COLORS} />
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

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border rounded-lg p-3">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          The stages shown above reflect the current pipeline definitions used by the Job Board.
          Renaming, adding, or removing stages here is not yet wired to the live board — the board's
          columns are defined in code. Reach out to have a stage permanently added or renamed.
        </p>
      </div>

      <Button onClick={() => toast.success("Job board settings saved")} className="w-full sm:w-auto">Save Changes</Button>
    </div>
  );
}