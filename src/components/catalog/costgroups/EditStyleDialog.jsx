import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { OVERRIDE_FIELDS } from "@/lib/costGroups";

export default function EditStyleDialog({ open, onOpenChange, item, category, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    const f = { name: item.name || "", default_description: item.default_description || "" };
    OVERRIDE_FIELDS.forEach((o) => { f[o.key] = item[o.key] ?? ""; });
    setForm(f);
  }, [open, item]);

  async function save() {
    const data = { name: form.name.trim() || item.name, default_description: form.default_description };
    OVERRIDE_FIELDS.forEach((o) => {
      const n = parseFloat(form[o.key]);
      data[o.key] = form[o.key] === "" || isNaN(n) ? null : n;
    });
    setSaving(true);
    await base44.entities.ServiceCatalog.update(item.id, data);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit style</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Profile</Label><Textarea rows={2} value={form.default_description || ""} onChange={(e) => setForm({ ...form, default_description: e.target.value })} /></div>
          {category?.is_railing && (
            <>
              <p className="text-xs text-muted-foreground">Layout overrides — leave blank to inherit the category default.</p>
              <div className="grid grid-cols-3 gap-3">
                {OVERRIDE_FIELDS.map((o) => (
                  <div key={o.key} className="space-y-1">
                    <Label className="text-xs">{o.label}</Label>
                    <Input type="number" step="any" placeholder={category?.[o.key] ?? ""} value={form[o.key] ?? ""} onChange={(e) => setForm({ ...form, [o.key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </DialogContent>
    </Dialog>
  );
}