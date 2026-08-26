import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOrgFilter, useWriteOrgId } from "@/lib/orgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Trash2, Plus, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  SALES_STAGES, SHOP_STAGES, BILLING_STAGES,
  SALES_COLORS, SHOP_COLORS, BILLING_COLORS,
  borderClassToHex,
} from "@/lib/pipelineHelpers";

// Build the seed list of {id, name, color} from a default stage array + color map.
function stagesToSeed(stages, colorMap) {
  return stages.map((name, i) => ({
    id: `seed-${i}`,
    name,
    color: borderClassToHex(colorMap[name]),
  }));
}

function StageRow({ stage, onRename, onDelete, onColorChange, index }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border rounded-lg group">
      <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
      <div className="relative">
        <input
          type="color"
          value={stage.color || "#94a3b8"
          }
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

function PipelineEditor({ title, board, initialStages }) {
  const orgFilter = useOrgFilter();
  const writeOrgId = useWriteOrgId();
  const qc = useQueryClient();

  // Load saved config for this board
  const { data: savedConfig } = useQuery({
    queryKey: ["pipelineStageConfigs", orgFilter],
    queryFn: () => base44.entities.PipelineStageConfig.filter(orgFilter),
  });

  const configRecord = savedConfig?.find(c => c.board === board) || null;

  const [stageRows, setStageRows] = useState(() =>
    configRecord?.stages?.length
      ? configRecord.stages
      : stagesToSeed(initialStages.stages, initialStages.colors)
  );

  // Re-sync when saved config loads (first load only)
  const [didSync, setDidSync] = useState(false);
  useEffect(() => {
    if (!didSync && savedConfig) {
      const rec = savedConfig.find(c => c.board === board);
      if (rec?.stages?.length) {
        setStageRows(rec.stages);
      }
      setDidSync(true);
    }
  }, [savedConfig, board, didSync]);

  const saveMutation = useMutation({
    mutationFn: async (stages) => {
      if (configRecord) {
        await base44.entities.PipelineStageConfig.update(configRecord.id, { stages });
      } else {
        await base44.entities.PipelineStageConfig.create({
          organization_id: writeOrgId,
          board,
          stages,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelineStageConfigs"] });
      toast.success(`${board} pipeline stages saved.`);
    },
    onError: (e) => toast.error(e?.message || "Failed to save stages."),
  });

  function addStage() {
    setStageRows(p => [...p, { id: `new-${Date.now()}`, name: "New Stage", color: "#94a3b8" }]);
  }

  function updateStage(id, patch) {
    setStageRows(p => p.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function deleteStage(id) {
    setStageRows(p => p.filter(s => s.id !== id));
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const reordered = Array.from(stageRows);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setStageRows(reordered);
  }

  function handleSave() {
    saveMutation.mutate(stageRows);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={`pipeline-${board}`}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
              {stageRows.map((s, index) => (
                <Draggable key={s.id} draggableId={s.id} index={index}>
                  {(prov) => (
                    <div ref={prov.innerRef} {...prov.draggableProps}>
                      <div {...prov.dragHandleProps}>
                        <StageRow
                          stage={s}
                          onRename={name => updateStage(s.id, { name })}
                          onColorChange={color => updateStage(s.id, { color })}
                          onDelete={() => deleteStage(s.id)}
                          index={index}
                        />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <Button size="sm" variant="outline" className="mt-2 gap-1.5 h-7 text-xs" onClick={addStage}>
        <Plus className="w-3 h-3" /> Add Stage
      </Button>
      <Button
        size="sm"
        className="mt-2 ml-2 h-7 text-xs gap-1.5"
        onClick={handleSave}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
        Save {board} Stages
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

      {/* Pipeline editors — persisted to PipelineStageConfig per org */}
      <div className="space-y-6">
        <PipelineEditor
          title="Sales Pipeline"
          board="Sales"
          initialStages={{ stages: SALES_STAGES, colors: SALES_COLORS }}
        />
        <PipelineEditor
          title="Shop Pipeline"
          board="Shop"
          initialStages={{ stages: SHOP_STAGES, colors: SHOP_COLORS }}
        />
        <PipelineEditor
          title="Billing Pipeline"
          board="Billing"
          initialStages={{ stages: BILLING_STAGES, colors: BILLING_COLORS }}
        />
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
          Drag stages by the handle to reorder them. Click <strong>Save</strong> on each pipeline
          to persist changes — they'll appear immediately on the Job Board.
        </p>
      </div>
    </div>
  );
}