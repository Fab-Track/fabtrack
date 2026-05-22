import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MessageSquare, Mail, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_TEMPLATES, MERGE_FIELDS } from "@/lib/commTemplates";
import { SALES_STAGES, SHOP_STAGES, BILLING_STAGES } from "@/lib/pipelineHelpers";

const ALL_STAGES = ["", ...SALES_STAGES, ...SHOP_STAGES, ...BILLING_STAGES];

function TemplateForm({ template, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    channel: "Both",
    stage_trigger: "",
    subject: "",
    sms_body: "",
    email_body: "",
    sort_order: 0,
    ...template,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Template Name *</Label>
          <Input className="h-8 text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Estimate Follow-Up" />
        </div>
        <div>
          <Label className="text-xs">Channel</Label>
          <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SMS">SMS only</SelectItem>
              <SelectItem value="Email">Email only</SelectItem>
              <SelectItem value="Both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Stage Trigger (optional)</Label>
        <Select value={form.stage_trigger || ""} onValueChange={v => setForm(p => ({ ...p, stage_trigger: v }))}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="No auto-queue" /></SelectTrigger>
          <SelectContent>
            {ALL_STAGES.map(s => <SelectItem key={s} value={s}>{s || "— No trigger —"}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {(form.channel === "Email" || form.channel === "Both") && (
        <div>
          <Label className="text-xs">Email Subject</Label>
          <Input className="h-8 text-sm" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject…" />
        </div>
      )}

      {(form.channel === "SMS" || form.channel === "Both") && (
        <div>
          <Label className="text-xs">SMS Body</Label>
          <textarea
            className="w-full min-h-[80px] p-2.5 text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            value={form.sms_body}
            onChange={e => setForm(p => ({ ...p, sms_body: e.target.value }))}
            placeholder="SMS message…"
          />
        </div>
      )}

      {(form.channel === "Email" || form.channel === "Both") && (
        <div>
          <Label className="text-xs">Email Body</Label>
          <textarea
            className="w-full min-h-[120px] p-2.5 text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            value={form.email_body}
            onChange={e => setForm(p => ({ ...p, email_body: e.target.value }))}
            placeholder="Email message…"
          />
        </div>
      )}

      {/* Merge field reference */}
      <div className="p-2 bg-muted/40 rounded-lg border">
        <p className="text-xs font-medium mb-1.5 text-muted-foreground">Available Merge Fields:</p>
        <div className="flex flex-wrap gap-1">
          {MERGE_FIELDS.map(f => (
            <code key={f.key} className="text-[10px] px-1.5 py-0.5 rounded border bg-card font-mono">{f.key}</code>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onSave(form)} className="flex-1">Save Template</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function MessageTemplatesSection() {
  const qc = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["messageTemplates"],
    queryFn: () => base44.entities.MessageTemplate.list("sort_order", 50),
  });

  // Seed default templates on first load
  useEffect(() => {
    if (!isLoading && templates.length === 0 && !seeded) {
      setSeeded(true);
      Promise.all(DEFAULT_TEMPLATES.map(t => base44.entities.MessageTemplate.create(t)))
        .then(() => qc.invalidateQueries({ queryKey: ["messageTemplates"] }));
    }
  }, [isLoading, templates.length, seeded]);

  async function handleSave(form) {
    if (editingTemplate?.id) {
      await base44.entities.MessageTemplate.update(editingTemplate.id, form);
      toast.success("Template updated");
    } else {
      await base44.entities.MessageTemplate.create({ ...form, sort_order: templates.length + 1 });
      toast.success("Template created");
    }
    qc.invalidateQueries({ queryKey: ["messageTemplates"] });
    setShowForm(false);
    setEditingTemplate(null);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this template?")) return;
    await base44.entities.MessageTemplate.delete(id);
    qc.invalidateQueries({ queryKey: ["messageTemplates"] });
    toast.success("Deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">Message Templates</h2>
          <p className="text-sm text-muted-foreground">Pre-written messages for common communication scenarios. Fully editable before sending.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingTemplate(null); setShowForm(true); }} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Template
        </Button>
      </div>

      {/* New / Edit form */}
      {showForm && (
        <div className="border rounded-xl p-4 bg-muted/20">
          <h3 className="text-sm font-semibold mb-3">{editingTemplate ? "Edit Template" : "New Template"}</h3>
          <TemplateForm
            template={editingTemplate}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => (
            <div key={tpl.id} className="border rounded-xl p-4 bg-card hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-sm">{tpl.name}</span>
                    <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                      {tpl.channel === "SMS" && <MessageSquare className="w-2.5 h-2.5" />}
                      {tpl.channel === "Email" && <Mail className="w-2.5 h-2.5" />}
                      {tpl.channel === "Both" && <><MessageSquare className="w-2.5 h-2.5" /><Mail className="w-2.5 h-2.5" /></>}
                      {tpl.channel}
                    </Badge>
                    {tpl.stage_trigger && (
                      <Badge className="text-[10px] px-1.5 bg-accent/20 text-accent-foreground border-accent/30">
                        Auto: {tpl.stage_trigger}
                      </Badge>
                    )}
                  </div>
                  {tpl.sms_body && (
                    <p className="text-xs text-muted-foreground truncate"><span className="font-medium text-foreground/70">SMS:</span> {tpl.sms_body}</p>
                  )}
                  {tpl.subject && (
                    <p className="text-xs text-muted-foreground truncate"><span className="font-medium text-foreground/70">Subject:</span> {tpl.subject}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingTemplate(tpl); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(tpl.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}