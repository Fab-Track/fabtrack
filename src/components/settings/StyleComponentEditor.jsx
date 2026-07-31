import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaterialCombobox from "./MaterialCombobox";
import AddMaterialDialog from "./AddMaterialDialog";

const COMPONENT_LABELS = ["Top Rail", "Bottom Rail", "Post", "Picket", "Cap", "Other"];

const DEFAULT_PARAMS = {
  post_spacing_in: 72,
  post_width_in: 1.5,
  picket_clear_gap_in: 4,
  picket_width_in: 0.5,
  rail_runs: 2,
};

export default function StyleComponentEditor({ open, onOpenChange, styleName, orgId }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [addMatOpen, setAddMatOpen] = useState(false);
  const [addMatRowIdx, setAddMatRowIdx] = useState(null);

  const { data: materials = [] } = useQuery({
    queryKey: ["materialPriceList", orgId],
    queryFn: () => orgId ? base44.entities.MaterialPriceList.filter({ organization_id: orgId }) : [],
    enabled: !!orgId && open,
  });

  const { data: existing } = useQuery({
    queryKey: ["styleComponentMap", orgId, styleName],
    queryFn: () => orgId && styleName
      ? base44.entities.StyleComponentMap.filter({ organization_id: orgId, style_name: styleName }).then(r => r[0] || null)
      : null,
    enabled: !!orgId && !!styleName && open,
  });

  useEffect(() => {
    if (existing) {
      setRows(existing.components || []);
    } else {
      setRows([]);
    }
  }, [existing]);

  // Railing takeoff parameters live on RailingStyleLibrary (the style record),
  // not on StyleComponentMap (which only holds the component list). Load the
  // style record so the parameters section can show and edit them.
  const { data: styleRecord } = useQuery({
    queryKey: ["railingStyleLibrary", orgId, styleName],
    queryFn: () => orgId && styleName
      ? base44.entities.RailingStyleLibrary.filter({ organization_id: orgId, style_name: styleName }).then(r => r[0] || null)
      : null,
    enabled: !!orgId && !!styleName && open,
  });

  const [params, setParams] = useState({
    post_spacing_in: String(DEFAULT_PARAMS.post_spacing_in),
    post_width_in: String(DEFAULT_PARAMS.post_width_in),
    picket_clear_gap_in: String(DEFAULT_PARAMS.picket_clear_gap_in),
    picket_width_in: String(DEFAULT_PARAMS.picket_width_in),
    rail_runs: String(DEFAULT_PARAMS.rail_runs),
  });

  useEffect(() => {
    setParams({
      post_spacing_in: String(styleRecord?.post_spacing_in ?? DEFAULT_PARAMS.post_spacing_in),
      post_width_in: String(styleRecord?.post_width_in ?? DEFAULT_PARAMS.post_width_in),
      picket_clear_gap_in: String(styleRecord?.picket_clear_gap_in ?? DEFAULT_PARAMS.picket_clear_gap_in),
      picket_width_in: String(styleRecord?.picket_width_in ?? DEFAULT_PARAMS.picket_width_in),
      rail_runs: String(styleRecord?.rail_runs ?? DEFAULT_PARAMS.rail_runs),
    });
  }, [styleRecord]);

  function addRow() {
    setRows(prev => [...prev, { component_label: "Top Rail", material_id: "", material_name: "" }]);
  }

  function updateRow(idx, field, value) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === "material") {
        return { ...r, material_id: value.id, material_name: value.name };
      }
      return { ...r, [field]: value };
    }));
  }

  function removeRow(idx) {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }

  function moveRow(idx, dir) {
    setRows(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        style_name: styleName,
        components: rows.filter(r => r.material_id),
      };
      if (existing) {
        await base44.entities.StyleComponentMap.update(existing.id, payload);
      } else {
        await base44.entities.StyleComponentMap.create(payload);
      }
      qc.invalidateQueries({ queryKey: ["styleComponentMap"] });

      // Persist takeoff parameters on the style library record (create if missing)
      const libPayload = {
        post_spacing_in: parseFloat(params.post_spacing_in) || 0,
        post_width_in: parseFloat(params.post_width_in) || 0,
        picket_clear_gap_in: parseFloat(params.picket_clear_gap_in) || 0,
        picket_width_in: parseFloat(params.picket_width_in) || 0,
        rail_runs: parseInt(params.rail_runs) || 0,
      };
      if (styleRecord) {
        await base44.entities.RailingStyleLibrary.update(styleRecord.id, libPayload);
      } else {
        await base44.entities.RailingStyleLibrary.create({ style_name: styleName, organization_id: orgId, ...libPayload });
      }
      qc.invalidateQueries({ queryKey: ["railingStyleLibrary"] });

      onOpenChange(false);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">Components — {styleName}</SheetTitle>
          <p className="text-xs text-muted-foreground">Define which materials make up this railing style.</p>
        </SheetHeader>

        <div className="border rounded-lg p-3 bg-muted/20 space-y-2 mb-4">
          <div>
            <p className="text-sm font-semibold">Railing Parameters</p>
            <p className="text-[11px] text-muted-foreground">
              Post height and picket length come from org standards at estimate time.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px]">Post spacing (in)</Label>
              <Input type="number" step="0.01" className="h-8 text-xs" value={params.post_spacing_in} onChange={e => setParams(p => ({ ...p, post_spacing_in: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">Post width (in)</Label>
              <Input type="number" step="0.01" className="h-8 text-xs" value={params.post_width_in} onChange={e => setParams(p => ({ ...p, post_width_in: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">Picket clear gap (in)</Label>
              <Input type="number" step="0.01" className="h-8 text-xs" value={params.picket_clear_gap_in} onChange={e => setParams(p => ({ ...p, picket_clear_gap_in: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">Picket width (in)</Label>
              <Input type="number" step="0.01" className="h-8 text-xs" value={params.picket_width_in} onChange={e => setParams(p => ({ ...p, picket_width_in: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px]">Rail runs</Label>
              <Input type="number" step="1" className="h-8 text-xs" value={params.rail_runs} onChange={e => setParams(p => ({ ...p, rail_runs: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-8">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No components yet. Add one below.</p>
          )}
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-start gap-1.5 border rounded-lg p-2.5">
              <div className="flex flex-col pt-7">
                <button
                  onClick={() => moveRow(idx, -1)}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveRow(idx, 1)}
                  disabled={idx === rows.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-[10px]">Component Label</Label>
                  <Select
                    value={row.component_label}
                    onValueChange={v => updateRow(idx, "component_label", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select label…" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_LABELS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Material</Label>
                  <MaterialCombobox
                    materials={materials}
                    value={row.material_id}
                    onChange={(m) => updateRow(idx, "material", m)}
                    onAddNew={() => { setAddMatRowIdx(idx); setAddMatOpen(true); }}
                    componentLabel={row.component_label}
                  />
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 mt-6 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeRow(idx)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addRow}>
            <Plus className="w-4 h-4" /> Add Component
          </Button>

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-background py-3 border-t">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Components"}
            </Button>
          </div>
        </div>

        <AddMaterialDialog
          open={addMatOpen}
          onOpenChange={setAddMatOpen}
          orgId={orgId}
          onCreated={(mat) => {
            qc.invalidateQueries({ queryKey: ["materialPriceList"] });
            if (addMatRowIdx !== null) {
              updateRow(addMatRowIdx, "material", mat);
              setAddMatRowIdx(null);
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}