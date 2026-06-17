import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_MATERIALS } from "@/lib/railingData";

const CATEGORIES = ["Square Tube", "Rectangle Tube", "Flat Bar", "HR Channel", "Angle", "Round Bar", "Stair", "Other"];

export default function MaterialsPriceSection() {
  const qc = useQueryClient();
  const [editPrices, setEditPrices] = useState({});
  const [saving, setSaving] = useState(null);
  const [seeded, setSeeded] = useState(false);

  const [orgId, setOrgId] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materialPriceList", orgId],
    queryFn: () => orgId ? base44.entities.MaterialPriceList.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!isLoading && materials.length === 0 && !seeded) {
      setSeeded(true);
      Promise.all(
        DEFAULT_MATERIALS.map(m =>
          base44.entities.MaterialPriceList.create({ name: m.name, category: m.category, cost_per_foot: m.costPerFoot, organization_id: orgId })
        )
      ).then(() => qc.invalidateQueries({ queryKey: ["materialPriceList"] }));
    }
  }, [isLoading, materials.length, seeded]);

  async function handleSave(mat) {
    setSaving(mat.id);
    const newPrice = parseFloat(editPrices[mat.id]);
    if (!isNaN(newPrice)) {
      await base44.entities.MaterialPriceList.update(mat.id, { cost_per_foot: newPrice });
      qc.invalidateQueries({ queryKey: ["materialPriceList"] });
      setEditPrices(p => { const n = { ...p }; delete n[mat.id]; return n; });
      toast.success("Price updated");
    }
    setSaving(null);
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = materials.filter(m => m.category === cat);
    return acc;
  }, {});
  grouped["Other"] = [...(grouped["Other"] || []), ...materials.filter(m => !CATEGORIES.includes(m.category))];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-base">Materials Price List</h2>
        <p className="text-sm text-muted-foreground">Update material costs here. Changes apply to all new estimates.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6">Loading materials…</p>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid gap-2 px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground" style={{ gridTemplateColumns: "2fr 1fr 1fr 80px" }}>
                  <span>Material</span><span>Category</span><span>$/linear ft</span><span></span>
                </div>
                {grouped[cat].map(mat => {
                  const price = editPrices[mat.id] !== undefined ? editPrices[mat.id] : mat.cost_per_foot?.toString() ?? "";
                  const parsedPrice = parseFloat(price);
                  const isMissing = !parsedPrice || parsedPrice <= 0;
                  return (
                    <div key={mat.id} className="grid gap-2 px-4 py-2 border-b last:border-0 items-center" style={{ gridTemplateColumns: "2fr 1fr 1fr 80px" }}>
                      <div className="flex items-center gap-1.5">
                        {isMissing && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        <span className="text-sm">{mat.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{mat.category}</span>
                      <Input
                        type="number"
                        className={`h-7 text-xs ${isMissing ? "border-amber-400" : ""}`}
                        step="0.0001"
                        value={price}
                        onChange={e => setEditPrices(p => ({ ...p, [mat.id]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleSave(mat)}
                      />
                      {editPrices[mat.id] !== undefined ? (
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleSave(mat)} disabled={saving === mat.id}>
                          {saving === mat.id ? "…" : <Save className="w-3 h-3" />}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">$/ft</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}