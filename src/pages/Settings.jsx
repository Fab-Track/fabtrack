import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, AlertTriangle, Save, Image, DollarSign, Check, Package, BookOpen, Activity } from "lucide-react";
import { toast } from "sonner";
import { RAILING_STYLES, DEFAULT_MATERIALS } from "@/lib/railingData";
import ProductServiceLibrarySection from "@/components/settings/ProductServiceLibrarySection";
import ServiceCatalogSection from "@/components/settings/ServiceCatalogSection";
import AdminActivityLogSection from "@/components/settings/AdminActivityLogSection";
import { useAuth } from "@/lib/AuthContext";

// ── Style Library ─────────────────────────────────────────────────────────────
function StyleLibrarySection() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(null);
  const [editDesc, setEditDesc] = useState({});

  const { data: library = [] } = useQuery({
    queryKey: ["railingStyleLibrary"],
    queryFn: () => base44.entities.RailingStyleLibrary.list(),
  });

  const byStyle = library.reduce((acc, r) => { acc[r.style_name] = r; return acc; }, {});

  const saveMutation = useMutation({
    mutationFn: async ({ styleName, photo_url, description }) => {
      const existing = byStyle[styleName];
      if (existing) {
        return base44.entities.RailingStyleLibrary.update(existing.id, { photo_url, description });
      }
      return base44.entities.RailingStyleLibrary.create({ style_name: styleName, photo_url, description });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["railingStyleLibrary"] });
      toast.success("Style updated");
    },
  });

  async function handlePhotoUpload(styleName, file) {
    setUploading(styleName);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existing = byStyle[styleName];
    const desc = editDesc[styleName] ?? existing?.description ?? "";
    await saveMutation.mutateAsync({ styleName, photo_url: file_url, description: desc });
    setUploading(null);
  }

  async function handleSaveDesc(styleName) {
    const existing = byStyle[styleName];
    const desc = editDesc[styleName] ?? existing?.description ?? "";
    await saveMutation.mutateAsync({ styleName, photo_url: existing?.photo_url || "", description: desc });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-base">Estimate Style Library</h2>
        <p className="text-sm text-muted-foreground">Upload photos for each railing style. These auto-attach to new estimates when that style is selected.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RAILING_STYLES.map(styleName => {
          const record = byStyle[styleName];
          const photo = record?.photo_url;
          const desc = editDesc[styleName] ?? record?.description ?? "";
          return (
            <div key={styleName} className="border rounded-xl p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{styleName}</p>
                {photo && <Badge variant="outline" className="text-xs gap-1"><Check className="w-3 h-3" /> Photo Set</Badge>}
              </div>
              {photo ? (
                <img src={photo} alt={styleName} className="w-full h-36 object-cover rounded-lg border" />
              ) : (
                <div className="w-full h-36 bg-muted/40 rounded-lg border border-dashed flex items-center justify-center">
                  <div className="text-center">
                    <Image className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">No photo yet</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="Optional description…"
                  value={desc}
                  onChange={e => setEditDesc(p => ({ ...p, [styleName]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Label className="flex-1 cursor-pointer">
                    <div className="h-7 px-3 text-xs rounded-md border border-input flex items-center gap-1.5 hover:bg-muted transition-colors">
                      {uploading === styleName ? (
                        <><span className="w-3 h-3 border-2 border-t-transparent border-primary rounded-full animate-spin" /> Uploading…</>
                      ) : (
                        <><Upload className="w-3 h-3" /> {photo ? "Replace Photo" : "Upload Photo"}</>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(styleName, e.target.files[0]); }}
                    />
                  </Label>
                  {editDesc[styleName] !== undefined && (
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleSaveDesc(styleName)}>
                      <Save className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Materials Price List ──────────────────────────────────────────────────────
const CATEGORIES = ["Square Tube", "Rectangle Tube", "Flat Bar", "HR Channel", "Angle", "Round Bar", "Stair", "Other"];

function MaterialsPriceSection() {
  const qc = useQueryClient();
  const [editPrices, setEditPrices] = useState({});
  const [saving, setSaving] = useState(null);
  const [seeded, setSeeded] = useState(false);

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materialPriceList"],
    queryFn: () => base44.entities.MaterialPriceList.list(),
  });

  // Seed default materials if none exist
  useEffect(() => {
    if (!isLoading && materials.length === 0 && !seeded) {
      setSeeded(true);
      Promise.all(
        DEFAULT_MATERIALS.map(m =>
          base44.entities.MaterialPriceList.create({ name: m.name, category: m.category, cost_per_foot: m.costPerFoot })
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
  // Include "Other" for any without a matching category
  grouped["Other"] = [...(grouped["Other"] || []), ...materials.filter(m => !CATEGORIES.includes(m.category))];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-base">Materials Price List</h2>
        <p className="text-sm text-muted-foreground">Update material costs here. Changes apply to all new estimates. Materials flagged with <AlertTriangle className="w-3 h-3 inline text-amber-500" /> need pricing before they can be used in a calculation.</p>
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

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const isOwnerOrAdmin = ["admin", "owner"].includes((user?.role || "").toLowerCase());

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage estimate templates, style photos, and material pricing.</p>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="catalog" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" />Service Catalog</TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5"><Package className="w-3.5 h-3.5" />Products & Services</TabsTrigger>
          <TabsTrigger value="styles" className="gap-1.5"><Image className="w-3.5 h-3.5" />Style Library</TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" />Materials Price List</TabsTrigger>
          {isOwnerOrAdmin && (
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-3.5 h-3.5" />Admin Activity Log</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="catalog"><ServiceCatalogSection /></TabsContent>
        <TabsContent value="products"><ProductServiceLibrarySection /></TabsContent>
        <TabsContent value="styles"><StyleLibrarySection /></TabsContent>
        <TabsContent value="materials"><MaterialsPriceSection /></TabsContent>
        {isOwnerOrAdmin && (
          <TabsContent value="activity"><AdminActivityLogSection /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}