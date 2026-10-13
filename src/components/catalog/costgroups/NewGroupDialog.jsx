import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function NewGroupDialog({ open, onOpenChange, orgId, categories, defaultCategoryId, onCreated }) {
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setCatId(defaultCategoryId || categories[0]?.id || "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const cat = categories.find((c) => c.id === catId);
    if (!name.trim() || !cat) return toast.error("Enter a name and choose a category");
    setSaving(true);
    const rec = await base44.entities.ServiceCatalog.create({
      organization_id: orgId,
      name: name.trim(),
      category_id: cat.id,
      category: cat.name,
      is_railing: !!cat.is_railing,
      is_active: true,
    });
    setSaving(false);
    setName("");
    onOpenChange(false);
    onCreated(rec);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New cost group</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Create cost group"}</Button>
      </DialogContent>
    </Dialog>
  );
}