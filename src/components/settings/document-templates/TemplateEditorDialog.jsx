import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_MAP, MERGE_FIELDS, DEFAULT_TEMPLATES } from "@/lib/documentTemplates";

export default function TemplateEditorDialog({ template, orgId, onClose, onSaved }) {
  const isNew = !template.id;
  const [form, setForm] = useState({ name: template.name || "", body: template.body || "" });
  const [saving, setSaving] = useState(false);
  const category = CATEGORY_MAP[template.category];

  const systemDefault = template.is_system
    ? DEFAULT_TEMPLATES.find((d) => d.category === template.category && d.name === template.name)
    : null;

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Give this template a name first");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await base44.entities.DocumentTemplate.create({
          organization_id: orgId,
          category: template.category,
          name: form.name.trim(),
          body: form.body,
          is_system: false,
          is_active: true,
          sort_order: 99,
        });
      } else {
        await base44.entities.DocumentTemplate.update(template.id, {
          name: form.name.trim(),
          body: form.body,
        });
      }
      toast.success(isNew ? "Template created" : "Template saved");
      onSaved();
    } catch (e) {
      toast.error("Couldn't save this template");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${template.name}"? This can't be undone.`)) return;
    await base44.entities.DocumentTemplate.delete(template.id);
    toast.success("Template deleted");
    onSaved();
  }

  function handleReset() {
    if (!systemDefault) return;
    if (!confirm(`Reset "${template.name}" to the original FabTrack content?`)) return;
    setForm({ name: systemDefault.name, body: systemDefault.body });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isNew ? `New ${category?.label || "Document"} Template` : template.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Template name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Progress Invoice"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Template content</Label>
            <Textarea
              rows={16}
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              className="text-xs font-mono leading-relaxed"
              placeholder="Write the document text. Use {{merge}} fields to pull in job data."
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {MERGE_FIELDS.map((f) => (
                <code
                  key={f}
                  onClick={() => setForm((p) => ({ ...p, body: `${p.body}${f}` }))}
                  className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/40 font-mono text-muted-foreground cursor-pointer hover:bg-accent/20 hover:text-foreground transition-colors"
                >
                  {f}
                </code>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            )}
            {systemDefault && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isNew ? "Create template" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}