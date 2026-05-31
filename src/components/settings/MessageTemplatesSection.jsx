import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, MessageSquare, Mail, Eye, RotateCcw, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_TEMPLATES, MERGE_FIELDS, resolveSampleData, smsSegmentCount } from "@/lib/commTemplates";
import { SALES_STAGES, SHOP_STAGES, BILLING_STAGES } from "@/lib/pipelineHelpers";

const ALL_STAGES = [null, ...SALES_STAGES, ...SHOP_STAGES, ...BILLING_STAGES];

// Find the default template matching by name
function getDefaultTemplate(name) {
  return DEFAULT_TEMPLATES.find(t => t.name === name) || null;
}

// ── Preview Modal ──────────────────────────────────────────────────────────────
function PreviewModal({ template, onClose }) {
  const [channel, setChannel] = useState("SMS");
  if (!template) return null;

  const smsResolved = resolveSampleData(template.sms_body || "");
  const emailResolved = resolveSampleData(template.email_body || "");
  const subjectResolved = resolveSampleData(template.subject || "");
  const segments = smsSegmentCount(smsResolved);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Preview — {template.name}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">Sample data filled in for preview purposes only.</p>

        {template.channel === "Both" && (
          <div className="flex gap-1 mt-1">
            <button
              onClick={() => setChannel("SMS")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${channel === "SMS" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <MessageSquare className="w-3 h-3 inline mr-1" />SMS
            </button>
            <button
              onClick={() => setChannel("Email")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${channel === "Email" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              <Mail className="w-3 h-3 inline mr-1" />Email
            </button>
          </div>
        )}

        {(channel === "SMS" || template.channel === "SMS") && template.sms_body && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SMS Message</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${segments > 1 ? "text-orange-600 border-orange-300 bg-orange-50" : "text-muted-foreground"}`}>
                {smsResolved.length} chars · {segments} msg{segments > 1 ? "s" : ""}
              </span>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border text-sm leading-relaxed whitespace-pre-wrap">{smsResolved}</div>
          </div>
        )}

        {(channel === "Email" || template.channel === "Email") && template.email_body && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</p>
            {subjectResolved && (
              <div className="border rounded-lg px-3 py-2 bg-muted/20">
                <span className="text-xs text-muted-foreground">Subject: </span>
                <span className="text-sm font-medium">{subjectResolved}</span>
              </div>
            )}
            <div className="bg-muted/40 rounded-xl p-3 border text-sm leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">{emailResolved}</div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={onClose} className="mt-2">Close</Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Inline Editor ──────────────────────────────────────────────────────────────
function InlineEditor({ template, onSave, onCancel }) {
  const [form, setForm] = useState({ ...template });
  const [showMergeFields, setShowMergeFields] = useState(false);

  const segments = smsSegmentCount(form.sms_body || "");

  return (
    <div className="mt-3 pt-3 border-t space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Template Name</Label>
          <Input className="h-8 text-sm" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
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
        <Select value={form.stage_trigger || "none"} onValueChange={v => setForm(p => ({ ...p, stage_trigger: v === "none" ? "" : v }))}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="No auto-queue" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— No trigger —</SelectItem>
            {ALL_STAGES.filter(Boolean).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {(form.channel === "Email" || form.channel === "Both") && (
        <div>
          <Label className="text-xs">Email Subject</Label>
          <Input className="h-8 text-sm" value={form.subject || ""} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject…" />
        </div>
      )}

      {(form.channel === "SMS" || form.channel === "Both") && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">SMS Body</Label>
            <span className={`text-[10px] font-mono ${segments > 1 ? "text-orange-500" : "text-muted-foreground"}`}>
              {(form.sms_body || "").length} chars · {segments} msg
            </span>
          </div>
          <textarea
            className="w-full min-h-[80px] p-2.5 text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            value={form.sms_body || ""}
            onChange={e => setForm(p => ({ ...p, sms_body: e.target.value }))}
            placeholder="SMS message…"
          />
        </div>
      )}

      {(form.channel === "Email" || form.channel === "Both") && (
        <div>
          <Label className="text-xs">Email Body</Label>
          <textarea
            className="w-full min-h-[140px] p-2.5 text-sm border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            value={form.email_body || ""}
            onChange={e => setForm(p => ({ ...p, email_body: e.target.value }))}
            placeholder="Email message…"
          />
        </div>
      )}

      {/* Merge fields toggle */}
      <button
        type="button"
        className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => setShowMergeFields(p => !p)}
      >
        {showMergeFields ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Available merge fields
      </button>
      {showMergeFields && (
        <div className="flex flex-wrap gap-1 p-2 bg-muted/40 rounded-lg border">
          {MERGE_FIELDS.map(f => (
            <code key={f.key} className="text-[10px] px-1.5 py-0.5 rounded border bg-card font-mono cursor-pointer hover:bg-accent/20 transition-colors" title={f.label}>{f.key}</code>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} className="gap-1.5"><Check className="w-3 h-3" /> Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="gap-1.5"><X className="w-3 h-3" /> Cancel</Button>
      </div>
    </div>
  );
}

// ── Main Section ───────────────────────────────────────────────────────────────
export default function MessageTemplatesSection() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
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
    if (form.id) {
      await base44.entities.MessageTemplate.update(form.id, form);
      toast.success("Template saved");
    } else {
      await base44.entities.MessageTemplate.create({ ...form, sort_order: templates.length + 1 });
      toast.success("Template created");
    }
    qc.invalidateQueries({ queryKey: ["messageTemplates"] });
    setEditingId(null);
  }

  async function handleToggle(tpl) {
    await base44.entities.MessageTemplate.update(tpl.id, { is_active: !tpl.is_active });
    qc.invalidateQueries({ queryKey: ["messageTemplates"] });
  }

  async function handleReset(tpl) {
    const def = getDefaultTemplate(tpl.name);
    if (!def) return toast.error("No default found for this template");
    if (!confirm(`Reset "${tpl.name}" to its default content? This cannot be undone.`)) return;
    await base44.entities.MessageTemplate.update(tpl.id, {
      sms_body: def.sms_body,
      email_body: def.email_body,
      subject: def.subject,
    });
    qc.invalidateQueries({ queryKey: ["messageTemplates"] });
    toast.success("Template reset to default");
  }

  async function handleAddNew() {
    const newTpl = await base44.entities.MessageTemplate.create({
      name: "New Template",
      channel: "Both",
      stage_trigger: "",
      subject: "",
      sms_body: "",
      email_body: "",
      is_active: true,
      sort_order: templates.length + 1,
    });
    qc.invalidateQueries({ queryKey: ["messageTemplates"] });
    setEditingId(newTpl.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">Message Templates</h2>
          <p className="text-sm text-muted-foreground">Pre-written notifications for estimates, invoices, installs, and more. All messages are reviewed before sending.</p>
        </div>
        <Button size="sm" onClick={handleAddNew} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => {
            const isEditing = editingId === tpl.id;
            const isInactive = tpl.is_active === false;
            const def = getDefaultTemplate(tpl.name);
            const segments = smsSegmentCount(tpl.sms_body || "");

            return (
              <div key={tpl.id} className={`border rounded-xl p-4 bg-card transition-colors ${isInactive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-medium text-sm ${isInactive ? "line-through text-muted-foreground" : ""}`}>{tpl.name}</span>
                      <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                        {(tpl.channel === "SMS" || tpl.channel === "Both") && <MessageSquare className="w-2.5 h-2.5" />}
                        {(tpl.channel === "Email" || tpl.channel === "Both") && <Mail className="w-2.5 h-2.5" />}
                        {tpl.channel}
                      </Badge>
                      {tpl.stage_trigger && (
                        <Badge className="text-[10px] px-1.5 bg-accent/20 text-accent-foreground border-accent/30">
                          Auto: {tpl.stage_trigger}
                        </Badge>
                      )}
                      {segments > 1 && tpl.sms_body && (
                        <Badge className="text-[10px] px-1.5 bg-orange-100 text-orange-700 border-orange-200">2-part SMS</Badge>
                      )}
                    </div>
                    {!isEditing && (
                      <>
                        {tpl.sms_body && (
                          <p className="text-xs text-muted-foreground truncate"><span className="font-medium text-foreground/60">SMS:</span> {tpl.sms_body}</p>
                        )}
                        {tpl.subject && (
                          <p className="text-xs text-muted-foreground truncate"><span className="font-medium text-foreground/60">Subject:</span> {tpl.subject}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={tpl.is_active !== false}
                      onCheckedChange={() => handleToggle(tpl)}
                      className="scale-75"
                      title={tpl.is_active !== false ? "Enabled" : "Disabled"}
                    />
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => setPreviewTemplate(tpl)}
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => setEditingId(isEditing ? null : tpl.id)}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {def && (
                      <Button
                        size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-orange-600"
                        onClick={() => handleReset(tpl)}
                        title="Reset to default"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <InlineEditor
                    template={tpl}
                    onSave={handleSave}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewTemplate && (
        <PreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}