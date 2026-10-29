import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pencil, MapPin, Plus, Trash2, Building } from "lucide-react";

export default function CustomerLocationsDirectory({ customer, onUpdated }) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ address: "", display_name: "", job_address: "" });
  const [saving, setSaving] = useState(false);

  const locations = customer.locations || [];

  function openAdd() {
    setEditId(null);
    setForm({ address: "", display_name: "", job_address: "" });
    setSheetOpen(true);
  }

  function openEdit(loc) {
    setEditId(loc.id);
    setForm({ address: loc.address || "", display_name: loc.display_name || "", job_address: loc.job_address || "" });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.address?.trim() && !form.display_name?.trim()) return;
    setSaving(true);
    const entry = {
      id: editId || crypto.randomUUID(),
      address: form.address || "",
      display_name: form.display_name || "",
      job_address: form.job_address || "",
      created_at: editId
        ? (locations.find(l => l.id === editId)?.created_at || new Date().toISOString())
        : new Date().toISOString(),
    };
    const updated = editId
      ? locations.map(l => l.id === editId ? entry : l)
      : [...locations, entry];
    await base44.entities.Customer.update(customer.id, { locations: updated });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    onUpdated({ ...customer, locations: updated });
    setSaving(false);
    setSheetOpen(false);
  }

  async function handleDelete(id) {
    const updated = locations.filter(l => l.id !== id);
    await base44.entities.Customer.update(customer.id, { locations: updated });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    onUpdated({ ...customer, locations: updated });
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Locations Directory</p>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={openAdd}>
          <Plus className="w-3 h-3" /> Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No locations saved yet. Add job sites or service addresses here.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map(loc => (
            <div key={loc.id} className="border rounded-lg p-3 bg-muted/30 group relative">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{loc.display_name || loc.address || "Unnamed Location"}</span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(loc)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(loc.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {loc.address && (
                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                  <Building className="w-3 h-3 mt-0.5 shrink-0" /> {loc.address}
                </p>
              )}
              {loc.job_address && loc.job_address !== loc.address && (
                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {loc.job_address}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> {editId ? "Edit Location" : "Add Location"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City, State" />
            </div>
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="Main Office, Job Site" />
            </div>
            <div>
              <Label className="text-xs">Job Address</Label>
              <Input value={form.job_address} onChange={e => setForm(p => ({ ...p, job_address: e.target.value }))} placeholder="456 Job Site Ave" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={(!form.address?.trim() && !form.display_name?.trim()) || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}