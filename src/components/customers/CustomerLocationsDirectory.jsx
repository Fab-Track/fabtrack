import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pencil, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import LocationFields, { composeLocationAddress } from "@/components/customers/LocationFields";

const EMPTY_LOCATION = { label: "", street: "", city: "", state: "", zip: "", lat: null, lng: null };

function toEditorValues(location) {
  if (!location) return EMPTY_LOCATION;
  const parts = {
    street: location.street || "",
    city: location.city || "",
    state: location.state || "",
    zip: location.zip || "",
  };
  const hasParts = parts.street || parts.city || parts.state || parts.zip;
  return {
    label: location.label || location.display_name || "",
    // Legacy locations stored only a composed address — surface it as the street line
    street: hasParts ? parts.street : (location.address || ""),
    city: parts.city,
    state: parts.state,
    zip: parts.zip,
    lat: location.lat ?? null,
    lng: location.lng ?? null,
  };
}

export default function CustomerLocationsDirectory({ customer, onUpdated }) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_LOCATION);
  const [saving, setSaving] = useState(false);

  const locations = customer.locations || [];

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_LOCATION);
    setSheetOpen(true);
  }

  function openEdit(loc) {
    setEditId(loc.id);
    setForm(toEditorValues(loc));
    setSheetOpen(true);
  }

  async function updateLocations(nextLocations) {
    await base44.entities.Customer.update(customer.id, { locations: nextLocations });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    onUpdated({ ...customer, locations: nextLocations });
  }

  async function handleSave() {
    const address = composeLocationAddress(form);
    if (!address && !form.label?.trim()) return;
    setSaving(true);

    const existing = locations.find((l) => l.id === editId);
    const entry = {
      ...(existing || {}),
      id: editId || crypto.randomUUID(),
      label: form.label?.trim() || "",
      display_name: form.label?.trim() || "",
      street: form.street || "",
      city: form.city || "",
      state: form.state || "",
      zip: form.zip || "",
      lat: form.lat ?? null,
      lng: form.lng ?? null,
      address,
      created_at: existing?.created_at || new Date().toISOString(),
    };

    const updated = editId
      ? locations.map((l) => (l.id === editId ? entry : l))
      : [...locations, entry];

    await updateLocations(updated);

    // A saved-location edit flows to the jobs linked to that location — never the other way round
    if (editId && address) {
      const linkedJobs = await base44.entities.Job.filter({ location_id: editId });
      if (linkedJobs.length) {
        await base44.entities.Job.bulkUpdate(
          linkedJobs.map((j) => ({
            id: j.id,
            site_address: address,
            site_lat: entry.lat,
            site_lng: entry.lng,
          }))
        );
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        queryClient.invalidateQueries({ queryKey: ["job"] });
        toast.success(`Location saved. ${linkedJobs.length} linked job${linkedJobs.length === 1 ? "" : "s"} updated.`);
      }
    }

    setSaving(false);
    setSheetOpen(false);
  }

  async function handleDelete(id) {
    await updateLocations(locations.filter((l) => l.id !== id));
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saved Locations</p>
          <p className="text-[10px] text-muted-foreground">Job sites and service addresses saved for this customer.</p>
        </div>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={openAdd}>
          <Plus className="w-3 h-3" /> Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No locations saved yet. Add job sites or service addresses here.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="border rounded-lg p-3 bg-muted/30 group relative">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{loc.label || loc.display_name || loc.address || "Unnamed Location"}</span>
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
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {loc.address}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> {editId ? "Edit Location" : "Add Location"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {editId
                ? "Changes flow to every job linked to this location."
                : "Saving here adds the address to this customer's location directory."}
            </p>
          </SheetHeader>

          <LocationFields values={form} onChange={setField} />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={(!composeLocationAddress(form) && !form.label?.trim()) || saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}