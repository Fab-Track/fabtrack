import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NumberFieldsDialog({ open, onOpenChange, title, hint, fields, values, allowBlank, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const f = {};
    fields.forEach((x) => { f[x.key] = values?.[x.key] ?? ""; });
    setForm(f);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const out = {};
    fields.forEach((x) => {
      const v = form[x.key];
      if (v === "" || v == null) { if (allowBlank) out[x.key] = null; return; }
      const n = parseFloat(v);
      if (!isNaN(n)) out[x.key] = n;
    });
    setSaving(true);
    await onSave(out);
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <div className="grid grid-cols-2 gap-3">
          {fields.map((x) => (
            <div key={x.key} className="space-y-1">
              <Label className="text-xs">{x.label}</Label>
              <Input type="number" step="any" value={form[x.key] ?? ""} onChange={(e) => setForm({ ...form, [x.key]: e.target.value })} />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </DialogContent>
    </Dialog>
  );
}