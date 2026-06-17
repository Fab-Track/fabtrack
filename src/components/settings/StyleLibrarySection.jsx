import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { RAILING_STYLES } from "@/lib/railingData";

export default function StyleLibrarySection() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(null);
  const [editDesc, setEditDesc] = useState({});

  const [orgId, setOrgId] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: library = [] } = useQuery({
    queryKey: ["railingStyleLibrary", orgId],
    queryFn: () => orgId ? base44.entities.RailingStyleLibrary.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const byStyle = library.reduce((acc, r) => { acc[r.style_name] = r; return acc; }, {});

  const saveMutation = useMutation({
    mutationFn: async ({ styleName, photo_url, description }) => {
      const existing = byStyle[styleName];
      if (existing) {
        return base44.entities.RailingStyleLibrary.update(existing.id, { photo_url, description });
      }
      if (!orgId) return toast.error("Cannot save — organization not loaded");
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