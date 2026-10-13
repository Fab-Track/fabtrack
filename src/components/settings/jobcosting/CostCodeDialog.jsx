import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Add / edit a cost code. `code` is null when adding.
export default function CostCodeDialog({ open, onOpenChange, code, allCodes, orgId, onSaved }) {
  const [form, setForm] = useState({ code_number: "", name: "", qbo_item_name: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ code_number: code?.code_number || "", name: code?.name || "", qbo_item_name: code?.qbo_item_name || "" });
    setError("");
  }, [open, code]);

  async function save() {
    const name = form.name.trim();
    if (!name) return setError("Name is required.");
    const dup = allCodes.some((c) => c.id !== code?.id && c.name.trim().toLowerCase() === name.toLowerCase());
    if (dup) return setError("A cost code with this name already exists.");
    setBusy(true);
    const data = { code_number: form.code_number.trim(), name, qbo_item_name: form.qbo_item_name.trim() };
    if (code) await base44.entities.CostCode.update(code.id, data);
    else await base44.entities.CostCode.create({ ...data, organization_id: orgId, active: true });
    setBusy(false);
    onSaved();
    onOpenChange(false);
  }

  async function toggleArchive() {
    setBusy(true);
    await base44.entities.CostCode.update(code.id, { active: code.active === false });
    setBusy(false);
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{code ? "Edit cost code" : "New cost code"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Code</Label>
            <Input className="font-mono" value={form.code_number} onChange={(e) => setForm({ ...form, code_number: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">QuickBooks item</Label>
            <Input placeholder="Not linked" value={form.qbo_item_name} onChange={(e) => setForm({ ...form, qbo_item_name: e.target.value })} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {code ? (
            <Button variant="outline" disabled={busy} onClick={toggleArchive}>{code.active === false ? "Restore" : "Archive"}</Button>
          ) : <span />}
          <Button disabled={busy} onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}