import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_MATERIALS } from "@/lib/railingData";
import AddMaterialDialog from "./AddMaterialDialog";

const CATEGORIES = ["Square Tube", "Rectangle Tube", "Flat Bar", "HR Channel", "Angle", "Round Bar", "Stair", "Other"];
const COMPONENT_TYPES = ["Top Rail", "Bottom Rail", "Post", "Picket", "Cap", "Other"];

export default function MaterialsPriceSection() {
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materialPriceList", orgId],
    queryFn: () => orgId ? base44.entities.MaterialPriceList.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!isLoading && materials.length === 0 && !seeded && orgId) {
      setSeeded(true);
      Promise.all(
        DEFAULT_MATERIALS.map(m =>
          base44.entities.MaterialPriceList.create({
            name: m.name,
            category: m.category,
            component_type: "Other",
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
      : mat[field]?.toString() ?? "";
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
      if (e.cost_per_foot !== undefined) updates.cost_per_foot = parseFloat(e.cost_per_foot) || 0;
      await base44.entities.MaterialPriceList.update(mat.id, updates);
      qc.invalidateQueries({ queryKey: ["materialPriceList"] });
      setEdits(prev => { const n = { ...prev }; delete n[mat.id]; return n; });
      toast.success("Material updated");
    } catch {
      toast.error("Failed to update material");
    }
    setSavingId(null);
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

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = materials.filter(m => (m.category || "Other") === cat);
    return acc;
  }, {});
  // Also catch any materials with non-standard categories
  const uncategorized = materials.filter(m => !CATEGORIES.includes(m.category));
  if (uncategorized.length > 0) grouped["Other"] = [...(grouped["Other"] || []), ...uncategorized];

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

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6">Loading materials…</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">Seeding default materials…</p>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid gap-2 px-3 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground"
                     style={{ gridTemplateColumns: "2fr 1.3fr 1.3fr 1fr 72px" }}>
                  <span>Material</span>
                  <span>Category</span>
                  <span>Component</span>
                  <span>$/ft</span>
                  <span></span>
                </div>
                {grouped[cat].map(mat => {
                  const price = getField(mat, "cost_per_foot");
                  const parsedPrice = parseFloat(price);
                  const isMissing = !parsedPrice || parsedPrice <= 0;
                  const dirty = isDirty(mat);
                  return (
                    <div key={mat.id}
                      className="grid gap-2 px-3 py-2 border-b last:border-0 items-center"
                      style={{ gridTemplateColumns: "2fr 1.3fr 1.3fr 1fr 72px" }}>
                      <Input
                        className="h-7 text-xs"
                        value={getField(mat, "name")}
                        onChange={e => setField(mat.id, "name", e.target.value)}
                      />
                      <Select
                        value={getField(mat, "category")}
                        onValueChange={v => setField(mat.id, "category", v)}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select
                        value={getField(mat, "component_type")}
                        onValueChange={v => setField(mat.id, "component_type", v)}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{COMPONENT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        {isMissing && !dirty && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                        <Input
                          type="number"
                          className={`h-7 text-xs ${isMissing && !dirty ? "border-amber-400" : ""}`}
                          step="0.0001"
                          value={price}
                          onChange={e => setField(mat.id, "cost_per_foot", e.target.value)}
                        />
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
        onCreated={() => qc.invalidateQueries({ queryKey: ["materialPriceList"] })}
      />
    </div>
  );
}