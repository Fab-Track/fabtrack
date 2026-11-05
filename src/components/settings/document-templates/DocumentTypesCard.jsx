import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Lock, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BUILT_IN = [
  { name: "Estimate", description: "Priced scope of work with the estimate builder." },
  { name: "Invoice", description: "Deposit, progress and final billing." },
  { name: "Change Order", description: "Scope and price changes after approval." },
];

export default function DocumentTypesCard({ orgId }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const { data: types = [] } = useQuery({
    queryKey: ["documentTypes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const page = await base44.entities.DocumentType.filter(
        { organization_id: orgId },
        { sort: "sort_order", limit: 100 }
      );
      return page.items ?? page;
    },
  });

  async function handleAdd() {
    if (!form.name.trim()) {
      toast.error("Give this document type a name");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.DocumentType.create({
        organization_id: orgId,
        name: form.name.trim(),
        description: form.description.trim(),
        sort_order: types.length + 1,
      });
      toast.success("Document type added");
      qc.invalidateQueries({ queryKey: ["documentTypes", orgId] });
      setAdding(false);
      setForm({ name: "", description: "" });
    } catch (e) {
      toast.error("Couldn't add this document type");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type) {
    if (!confirm(`Delete the "${type.name}" document type? Documents already created keep their own copy.`)) return;
    await base44.entities.DocumentType.delete(type.id);
    toast.success("Document type deleted");
    qc.invalidateQueries({ queryKey: ["documentTypes", orgId] });
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Layers className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Document Types</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Every type gets its own group on a job's Documents tab. Estimate, Invoice and Change Order are built in.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={() => setAdding(true)}>
          <Plus className="w-3 h-3" /> Add type
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {BUILT_IN.map((t) => (
          <span
            key={t.name}
            title={t.description}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground"
          >
            <Lock className="w-3 h-3" /> {t.name}
          </span>
        ))}
        {types.map((t) => (
          <span
            key={t.id}
            title={t.description}
            className="group flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
          >
            {t.name}
            <button
              onClick={() => handleDelete(t)}
              className="text-muted-foreground/50 hover:text-destructive transition-colors"
              title="Delete this document type"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add a document type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Type name</Label>
              <Input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Submittal, Material Takeoff, Site Visit"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What this document is used for"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add type
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}