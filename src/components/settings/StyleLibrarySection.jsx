import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, Check, Save, Layers } from "lucide-react";
import { toast } from "sonner";
import { RAILING_STYLES } from "@/lib/railingData";
import StyleComponentEditor from "./StyleComponentEditor";

export default function StyleLibrarySection() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(null);
  const [editDesc, setEditDesc] = useState({});
  const [componentStyle, setComponentStyle] = useState(null);

  const [orgId, setOrgId] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: library = [] } = useQuery({
    queryKey: ["railingStyleLibrary", orgId],
    queryFn: () => orgId ? base44.entities.RailingStyleLibrary.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const { data: componentMaps = [] } = useQuery({
    queryKey: ["styleComponentMap", orgId],
    queryFn: () => orgId ? base44.entities.StyleComponentMap.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const byStyle = library.reduce((acc, r) => { acc[r.style_name] = r; return acc; }, {});
  const componentCountByStyle = componentMaps.reduce((acc, m) => {
    acc[m.style_name] = (m.components || []).length;
    return acc;
  }, {});

  const saveMutation = useMutation({
    mutationFn: async ({ styleName, photo_url, description }) => {
      const existing = byStyle[styleName];
      if (existing) {
        return base44.entities.RailingStyleLibrary.update(existing.id, { photo_url, description });
      }
      if (!orgId) { toast.error("Cannot save — organization not loaded"); return; }
      return base44.entities.RailingStyleLibrary.create({ style_name: styleName, photo_url, description, organization_id: orgId });
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
        <h2 className="font-semibold text-base">Style Library</h2>
        <p className="text-sm text-muted-foreground">
          Upload photos and define component materials for each railing style. Components auto-populate estimates when this style is selected.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RAILING_STYLES.map(styleName => {
          const record = byStyle[styleName];
          const photo = record?.photo_url;
          const desc = editDesc[styleName] ?? record?.description ?? "";
          const componentCount = componentCountByStyle[styleName] || 0;
          return (
            <div key={styleName} className="border rounded-xl p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{styleName}</p>
                <div className="flex items-center gap-1.5">
                  {componentCount > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Layers className="w-3 h-3" /> {componentCount}
                    </Badge>
                  )}
                  {photo && <Badge variant="outline" className="text-xs gap-1"><Check className="w-3 h-3" /> Photo</Badge>}
                </div>
              </div>
              {photo ? (
                <img src={photo} alt={styleName} className="w-full h-36 object-cover rounded-lg border" />
              ) : (
                <div className="w-full h-36 bg-muted/40 rounded-lg border border-dashed flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
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
                        <><Upload className="w-3 h-3" /> {photo ? "Replace" : "Upload Photo"}</>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5"
                  onClick={() => setComponentStyle(styleName)}
                >
                  <Layers className="w-3.5 h-3.5" /> {componentCount > 0 ? "Edit Components" : "Define Components"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <StyleComponentEditor
        open={!!componentStyle}
        onOpenChange={(open) => { if (!open) setComponentStyle(null); }}
        styleName={componentStyle}
        orgId={orgId}
      />
    </div>
  );
}