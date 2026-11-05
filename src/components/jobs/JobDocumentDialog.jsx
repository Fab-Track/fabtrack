import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buildMergeContext, renderTemplate } from "@/lib/documentTemplates";

const STATUS_OPTIONS = ["Draft", "Sent", "Approved", "Void"];

export default function JobDocumentDialog({ job, customer, docType, document, currentUser, onClose, onSaved }) {
  const qc = useQueryClient();
  const isNew = !document;
  const typeName = docType?.name || document?.type_name || "Document";
  const orgId = job.organization_id;

  const [form, setForm] = useState({
    title: document?.title || "",
    body: document?.body || "",
    status: document?.status || "Draft",
    template_name: document?.template_name || "",
  });
  const [saving, setSaving] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["documentTemplates", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const page = await base44.entities.DocumentTemplate.filter(
        { organization_id: orgId },
        { sort: "sort_order", limit: 200 }
      );
      return page.items ?? page;
    },
  });

  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    enabled: !!orgId,
    queryFn: () => base44.entities.Organization.get(orgId).catch(() => null),
  });

  function applyTemplate(name) {
    const tpl = templates.find((t) => t.name === name);
    if (!tpl) {
      setForm((p) => ({ ...p, template_name: "" }));
      return;
    }
    const rendered = renderTemplate(tpl.body || "", buildMergeContext({ job, customer, org }));
    setForm((p) => ({
      ...p,
      template_name: name,
      title: p.title.trim() ? p.title : tpl.name,
      body: rendered,
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Give this document a title");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await base44.entities.JobDocument.create({
          organization_id: orgId,
          job_id: job.id,
          job_number: job.job_number || "",
          document_type_id: docType?.id || "",
          type_name: typeName,
          template_name: form.template_name,
          title: form.title.trim(),
          body: form.body,
          status: form.status,
          created_by_name: currentUser?.full_name || "",
        });
        toast.success(`${typeName} created`);
      } else {
        await base44.entities.JobDocument.update(document.id, {
          title: form.title.trim(),
          body: form.body,
          status: form.status,
          template_name: form.template_name,
        });
        toast.success("Document saved");
      }
      qc.invalidateQueries({ queryKey: ["jobDocuments", job.id] });
      onSaved();
    } catch (e) {
      toast.error("Couldn't save this document");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${document.title}"? This can't be undone.`)) return;
    await base44.entities.JobDocument.delete(document.id);
    toast.success("Document deleted");
    qc.invalidateQueries({ queryKey: ["jobDocuments", job.id] });
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isNew ? `New ${typeName}` : form.title || typeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={`${typeName} — ${job.job_name || ""}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Start from a template</Label>
            <Select value={form.template_name || "none"} onValueChange={(v) => applyTemplate(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Blank document" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Blank document</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Job and customer details are filled in automatically when you pick a template.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Textarea
              rows={16}
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              className="text-xs font-mono leading-relaxed"
              placeholder="Write the document…"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {!isNew ? (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isNew ? "Create document" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}