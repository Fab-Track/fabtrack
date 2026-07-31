import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_MATERIALS } from "@/lib/railingData";
import AddMaterialDialog from "./AddMaterialDialog";
import CategorySelect from "./CategorySelect";
import ComponentUseSelect from "./ComponentUseSelect";

const CATEGORIES = ["Square Tube", "Rectangle Tube", "Flat Bar", "HR Channel", "Angle", "Round Bar", "Stair", "Other"];

// Material | Category | Component | Stock | $/stick | Wt/stick | lb/ft | Eff $/lb | $/lb override | $/ft | actions
const GRID_COLS = "2fr 1.1fr 1.1fr 0.55fr 0.55fr 0.55fr 0.55fr 0.6fr 0.55fr 0.7fr 56px";

// Auto-derive cost_per_foot when both stick cost and stock length are present.
function deriveCostPerFoot(stick, stock) {
  if (stick > 0 && stock > 0) {
    return Math.round((stick / stock) * 10000) / 10000;
  }
  return null;
}

// Auto-derive weight_per_ft when both stick weight and stock length are present.
function deriveWeightPerFt(stickWeight, stock) {
  if (stickWeight > 0 && stock > 0) {
    return Math.round((stickWeight / stock) * 10000) / 10000;
  }
  return null;
}

// Resolve the effective $/lb for a material, in priority order:
//   1. Auto: cost_per_stick / weight_per_stick (when both > 0)
//   2. Manual price_per_lb_override (when > 0)
//   3. Org-level steel_price_per_lb (when > 0)
// Returns { value, mode } where mode is "auto" | "override" | "org" | null.
function effectivePerLb(stickCost, stickWeight, override, orgPrice) {
  if (stickCost > 0 && stickWeight > 0) {
    return { value: Math.round((stickCost / stickWeight) * 10000) / 10000, mode: "auto" };
  }
  if (override && override > 0) {
    return { value: override, mode: "override" };
  }
  if (orgPrice && orgPrice > 0) {
    return { value: orgPrice, mode: "org" };
  }
  return { value: null, mode: null };
}

// Normalize an override edit to a stored value: empty/0/NaN → null (meaning "use org price").
function normalizeOverride(raw) {
  const n = parseFloat(raw);
  return isNaN(n) || n <= 0 ? null : n;
}

export default function MaterialsPriceSection() {
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Org-level steel price per pound (lives on a dedicated AppSettings row).
  const [steelPrice, setSteelPrice] = useState("");
  const [steelDirty, setSteelDirty] = useState(false);
  const [savingSteel, setSavingSteel] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materialPriceList", orgId],
    queryFn: () => orgId ? base44.entities.MaterialPriceList.filter({ organization_id: orgId }, undefined, 500) : [],
    enabled: !!orgId,
  });

  const { data: steelSettingsArr = [] } = useQuery({
    queryKey: ["appSettings", "steel_price_per_lb", orgId],
    queryFn: () => orgId ? base44.entities.AppSettings.filter({ setting_key: "steel_price_per_lb", organization_id: orgId }, undefined, 1) : [],
    enabled: !!orgId,
  });
  const orgSteelPrice = steelSettingsArr[0]?.steel_price_per_lb ?? 0;

  useEffect(() => {
    if (steelSettingsArr.length > 0 && steelSettingsArr[0].steel_price_per_lb !== undefined) {
      setSteelPrice(String(steelSettingsArr[0].steel_price_per_lb ?? ""));
      setSteelDirty(false);
    }
  }, [steelSettingsArr]);

  // Org-level railing dimension standards (residential / commercial)
  const [railingStd, setRailingStd] = useState({ res_post_height_in: "", res_picket_length_in: "", comm_post_height_in: "", comm_picket_length_in: "" });
  const [railingStdDirty, setRailingStdDirty] = useState(false);
  const [savingRailingStd, setSavingRailingStd] = useState(false);

  const { data: railingStdArr = [] } = useQuery({
    queryKey: ["appSettings", "railing_standards", orgId],
    queryFn: () => orgId ? base44.entities.AppSettings.filter({ setting_key: "railing_standards", organization_id: orgId }, undefined, 1) : [],
    enabled: !!orgId,
  });

  useEffect(() => {
    const r = railingStdArr[0];
    setRailingStd({
      res_post_height_in: String(r?.res_post_height_in ?? 36),
      res_picket_length_in: String(r?.res_picket_length_in ?? 29.5),
      comm_post_height_in: String(r?.comm_post_height_in ?? 43),
      comm_picket_length_in: String(r?.comm_picket_length_in ?? 36.5),
    });
    setRailingStdDirty(false);
  }, [railingStdArr]);

  async function saveRailingStandards() {
    if (!orgId) return;
    setSavingRailingStd(true);
    try {
      const val = {
        res_post_height_in: parseFloat(railingStd.res_post_height_in) || 0,
        res_picket_length_in: parseFloat(railingStd.res_picket_length_in) || 0,
        comm_post_height_in: parseFloat(railingStd.comm_post_height_in) || 0,
        comm_picket_length_in: parseFloat(railingStd.comm_picket_length_in) || 0,
      };
      const existing = railingStdArr[0];
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, val);
      } else {
        await base44.entities.AppSettings.create({ organization_id: orgId, setting_key: "railing_standards", ...val });
      }
      qc.invalidateQueries({ queryKey: ["appSettings", "railing_standards"] });
      setRailingStdDirty(false);
      toast.success("Railing standards saved");
    } catch {
      toast.error("Failed to save railing standards");
    }
    setSavingRailingStd(false);
  }

  useEffect(() => {
    if (!isLoading && materials.length === 0 && !seeded && orgId) {
      setSeeded(true);
      Promise.all(
        DEFAULT_MATERIALS.map(m =>
          base44.entities.MaterialPriceList.create({
            name: m.name,
            category: m.category,
            component_type: ["Other"],
            cost_per_foot: m.costPerFoot,
            organization_id: orgId,
          })
        )
      ).then(() => qc.invalidateQueries({ queryKey: ["materialPriceList"] }));
    }
  }, [isLoading, materials.length, seeded, orgId, qc]);

  const getField = (mat, field) => {
    return edits[mat.id]?.[field] !== undefined
      ? edits[mat.id][field]
      : mat[field] == null ? "" : mat[field].toString();
  };

  const setField = (id, field, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const isDirty = (mat) => !!edits[mat.id];

  async function handleSave(mat) {
    const e = edits[mat.id];
    if (!e) return;
    setSavingId(mat.id);
    try {
      const updates = {};
      if (e.name !== undefined) updates.name = e.name;
      if (e.category !== undefined) updates.category = e.category;
      if (e.component_type !== undefined) updates.component_type = e.component_type;
      if (e.stock_length_ft !== undefined) updates.stock_length_ft = parseFloat(e.stock_length_ft) || 0;
      if (e.cost_per_stick !== undefined) updates.cost_per_stick = parseFloat(e.cost_per_stick) || 0;
      if (e.weight_per_stick !== undefined) updates.weight_per_stick = parseFloat(e.weight_per_stick) || 0;
      if (e.price_per_lb_override !== undefined) updates.price_per_lb_override = normalizeOverride(e.price_per_lb_override);
      const stick = parseFloat(e.cost_per_stick !== undefined ? e.cost_per_stick : mat.cost_per_stick) || 0;
      const stock = parseFloat(e.stock_length_ft !== undefined ? e.stock_length_ft : mat.stock_length_ft) || 0;
      const stickWt = parseFloat(e.weight_per_stick !== undefined ? e.weight_per_stick : mat.weight_per_stick) || 0;
      const derived = deriveCostPerFoot(stick, stock);
      if (derived !== null) {
        updates.cost_per_foot = derived;
      } else if (e.cost_per_foot !== undefined) {
        updates.cost_per_foot = parseFloat(e.cost_per_foot) || 0;
      }
      const derivedWt = deriveWeightPerFt(stickWt, stock);
      if (derivedWt !== null) {
        updates.weight_per_ft = derivedWt;
      } else if (e.weight_per_ft !== undefined) {
        updates.weight_per_ft = parseFloat(e.weight_per_ft) || 0;
      }
      await base44.entities.MaterialPriceList.update(mat.id, updates);
      qc.invalidateQueries({ queryKey: ["materialPriceList"] });
      setEdits(prev => { const n = { ...prev }; delete n[mat.id]; return n; });
      toast.success("Material updated");
    } catch {
      toast.error("Failed to update material");
    }
    setSavingId(null);
  }

  async function saveSteelPrice() {
    if (!orgId) return;
    setSavingSteel(true);
    try {
      const val = parseFloat(steelPrice) || 0;
      const existing = steelSettingsArr[0];
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, { steel_price_per_lb: val });
      } else {
        await base44.entities.AppSettings.create({
          organization_id: orgId,
          setting_key: "steel_price_per_lb",
          steel_price_per_lb: val,
        });
      }
      qc.invalidateQueries({ queryKey: ["appSettings", "steel_price_per_lb"] });
      setSteelDirty(false);
      toast.success("Steel price saved");
    } catch {
      toast.error("Failed to save steel price");
    }
    setSavingSteel(false);
  }

  async function handleDelete(mat) {
    try {
      await base44.entities.MaterialPriceList.delete(mat.id);
      qc.invalidateQueries({ queryKey: ["materialPriceList"] });
      toast.success("Material deleted");
    } catch {
      toast.error("Failed to delete material");
    }
    setDeleteId(null);
  }

  const allCategories = [...new Set([...CATEGORIES, ...materials.map(m => m.category).filter(Boolean)])];
  const allComponentUses = [...new Set(materials.flatMap(m => Array.isArray(m.component_type) ? m.component_type : (m.component_type ? [m.component_type] : [])))];
  const grouped = allCategories.reduce((acc, cat) => {
    acc[cat] = materials.filter(m => (m.category || "Other") === cat);
    return acc;
  }, {});

  const getUses = (mat) => {
    const v = edits[mat.id]?.component_type !== undefined ? edits[mat.id].component_type : mat.component_type;
    if (Array.isArray(v)) return v;
    if (v) return [v];
    return [];
  };

  const overridePlaceholder = orgSteelPrice > 0 ? `→ $${orgSteelPrice}` : "uses org price";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">Materials</h2>
          <p className="text-sm text-muted-foreground">
            Master list of railing components. These are display-only specs — pricing is handled by the Service Catalog cost model.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add Material
        </Button>
      </div>

      {/* Org-level steel price per pound (fallback for per-material $/lb overrides) */}
      <div className="border rounded-lg p-3 bg-muted/20 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Steel price per pound ($/lb)</Label>
          <p className="text-[11px] text-muted-foreground mb-1.5">
            Org-level default. Materials use this unless they set their own $/lb override.
          </p>
          <Input
            type="number"
            step="0.01"
            className="h-9 text-sm max-w-[160px]"
            value={steelPrice}
            onChange={e => { setSteelPrice(e.target.value); setSteelDirty(true); }}
            placeholder="0.00"
          />
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!steelDirty || savingSteel}
          onClick={saveSteelPrice}
        >
          <Save className="w-3.5 h-3.5" /> {savingSteel ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Org-level railing dimension standards (residential / commercial) */}
      <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
        <div>
          <p className="text-sm font-semibold">Railing Standards</p>
          <p className="text-[11px] text-muted-foreground">
            Default post heights and picket lengths applied at estimate time.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Residential</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Post height (in)</Label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={railingStd.res_post_height_in} onChange={e => { setRailingStd(s => ({ ...s, res_post_height_in: e.target.value })); setRailingStdDirty(true); }} />
              </div>
              <div>
                <Label className="text-xs">Picket length (in)</Label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={railingStd.res_picket_length_in} onChange={e => { setRailingStd(s => ({ ...s, res_picket_length_in: e.target.value })); setRailingStdDirty(true); }} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Commercial</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Post height (in)</Label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={railingStd.comm_post_height_in} onChange={e => { setRailingStd(s => ({ ...s, comm_post_height_in: e.target.value })); setRailingStdDirty(true); }} />
              </div>
              <div>
                <Label className="text-xs">Picket length (in)</Label>
                <Input type="number" step="0.01" className="h-9 text-sm" value={railingStd.comm_picket_length_in} onChange={e => { setRailingStd(s => ({ ...s, comm_picket_length_in: e.target.value })); setRailingStdDirty(true); }} />
              </div>
            </div>
          </div>
        </div>
        <div>
          <Button size="sm" className="gap-1.5" disabled={!railingStdDirty || savingRailingStd} onClick={saveRailingStandards}>
            <Save className="w-3.5 h-3.5" /> {savingRailingStd ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6">Loading materials…</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">Seeding default materials…</p>
      ) : (
        <div className="space-y-5">
          {allCategories.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h3>
              <div className="border rounded-lg overflow-x-auto">
                <div className="grid gap-2 px-3 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground"
                     style={{ gridTemplateColumns: GRID_COLS }}>
                  <span>Material</span>
                  <span>Category</span>
                  <span>Component</span>
                  <span>Stock (ft)</span>
                  <span>$/stick</span>
                  <span>Wt/stick</span>
                  <span>lb/ft</span>
                  <span>Eff. $/lb</span>
                  <span>$/lb override</span>
                  <span>$/ft</span>
                  <span></span>
                </div>
                {grouped[cat].map(mat => {
                  const stick = parseFloat(getField(mat, "cost_per_stick")) || 0;
                  const stock = parseFloat(getField(mat, "stock_length_ft")) || 0;
                  const isAuto = stick > 0 && stock > 0;
                  const autoCost = deriveCostPerFoot(stick, stock);
                  const stickWt = parseFloat(getField(mat, "weight_per_stick")) || 0;
                  const isAutoWt = stickWt > 0 && stock > 0;
                  const autoWt = isAutoWt ? deriveWeightPerFt(stickWt, stock) : null;
                  const overrideVal = parseFloat(getField(mat, "price_per_lb_override")) || 0;
                  const effPerLb = effectivePerLb(stick, stickWt, overrideVal, orgSteelPrice);
                  const price = isAuto ? String(autoCost) : getField(mat, "cost_per_foot");
                  const parsedPrice = parseFloat(price);
                  const isMissing = !parsedPrice || parsedPrice <= 0;
                  const dirty = isDirty(mat);
                  return (
                    <div key={mat.id}
                      className="grid gap-2 px-3 py-2 border-b last:border-0 items-center"
                      style={{ gridTemplateColumns: GRID_COLS }}>
                      <Input
                        className="h-7 text-xs"
                        value={getField(mat, "name")}
                        onChange={e => setField(mat.id, "name", e.target.value)}
                      />
                      <CategorySelect
                        categories={allCategories}
                        value={getField(mat, "category")}
                        onChange={v => setField(mat.id, "category", v)}
                        className="h-7"
                      />
                      <ComponentUseSelect
                        value={getUses(mat)}
                        onChange={v => setField(mat.id, "component_type", v)}
                        options={allComponentUses}
                        className="h-7"
                      />
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        step="0.01"
                        value={getField(mat, "stock_length_ft")}
                        onChange={e => setField(mat.id, "stock_length_ft", e.target.value)}
                        placeholder="0"
                      />
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        step="0.01"
                        value={getField(mat, "cost_per_stick")}
                        onChange={e => setField(mat.id, "cost_per_stick", e.target.value)}
                        placeholder="0.00"
                      />
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        step="0.01"
                        value={getField(mat, "weight_per_stick")}
                        onChange={e => setField(mat.id, "weight_per_stick", e.target.value)}
                        placeholder="0.00"
                      />
                      {isAutoWt ? (
                        <div
                          className="flex items-center gap-1 h-7 px-2 text-xs bg-muted rounded border border-dashed"
                          title={`Auto-derived: ${autoWt} = ${stickWt} lb / ${stock} ft`}
                        >
                          <span className="tabular-nums">{autoWt.toFixed(4)}</span>
                          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">auto</span>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          step="0.0001"
                          value={getField(mat, "weight_per_ft")}
                          onChange={e => setField(mat.id, "weight_per_ft", e.target.value)}
                          placeholder="0.00"
                        />
                      )}
                      <div className="flex items-center h-7">
                        {effPerLb.value != null ? (
                          <div
                            className="flex items-center gap-1 h-7 px-2 text-xs bg-muted rounded border border-dashed"
                            title={effPerLb.mode === "auto" ? `Auto: $${stick} / ${stickWt} lb` : effPerLb.mode === "override" ? "From $/lb override" : "From org steel price"}
                          >
                            <span className="tabular-nums">${effPerLb.value.toFixed(2)}</span>
                            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{effPerLb.mode}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </div>
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        step="0.01"
                        value={getField(mat, "price_per_lb_override")}
                        onChange={e => setField(mat.id, "price_per_lb_override", e.target.value)}
                        placeholder={overridePlaceholder}
                      />
                      <div className="flex items-center gap-1">
                        {isMissing && !dirty && !isAuto && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                        {isAuto ? (
                          <div
                            className="flex items-center gap-1 h-7 px-2 text-xs bg-muted rounded border border-dashed"
                            title={`Auto-derived: $${autoCost} = $${stick} / ${stock} ft`}
                          >
                            <span className="tabular-nums">${autoCost.toFixed(4)}</span>
                            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">auto</span>
                          </div>
                        ) : (
                          <Input
                            type="number"
                            className={`h-7 text-xs ${isMissing && !dirty ? "border-amber-400" : ""}`}
                            step="0.0001"
                            value={price}
                            onChange={e => setField(mat.id, "cost_per_foot", e.target.value)}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {dirty ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleSave(mat)}
                            disabled={savingId === mat.id}
                          >
                            {savingId === mat.id ? "…" : <Save className="w-3 h-3" />}
                          </Button>
                        ) : deleteId === mat.id ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2"
                            onClick={() => handleDelete(mat)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(deleteId === mat.id ? null : mat.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddMaterialDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        orgId={orgId}
        orgSteelPrice={orgSteelPrice}
        onCreated={() => qc.invalidateQueries({ queryKey: ["materialPriceList"] })}
      />
    </div>
  );
}