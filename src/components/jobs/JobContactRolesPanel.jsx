import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Plus, MapPin, Phone, Mail, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { formatPhoneDisplay } from "@/lib/phoneFormat";

/**
 * One contact-role dropdown with inline "+ Add contact".
 * Saves the selected contact_id to the job immediately.
 */
function ContactRoleSelect({ label, icon: Icon, contacts, selectedId, onSave, customerId }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", title: "" });

  const selected = contacts.find(c => c.id === selectedId) || null;

  async function handleSelect(contactId) {
    if (contactId === "__add__") { setAdding(true); return; }
    if (contactId === "__none__") { await onSave(""); return; }
    await onSave(contactId);
  }

  async function handleAddContact() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const newContact = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        title: form.title.trim(),
        is_primary: false,
        created_at: new Date().toISOString(),
      };
      const updated = [...contacts, newContact];
      await base44.entities.Customer.update(customerId, { contacts: updated });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      await onSave(newContact.id);
      setForm({ name: "", phone: "", email: "", title: "" });
      setAdding(false);
      toast.success("Contact added");
    } catch (e) {
      toast.error("Failed to add contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}{label}
      </p>
      {adding ? (
        <div className="space-y-1.5 p-2 border rounded-md bg-muted/30">
          <Input
            placeholder="Name *"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="h-7 text-xs"
          />
          <Input
            placeholder="Title / role"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="h-7 text-xs"
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddContact} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setAdding(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Select value={selectedId || "__none__"} onValueChange={handleSelect}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select contact…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {contacts.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.phone ? ` — ${formatPhoneDisplay(c.phone)}` : ""}
                </SelectItem>
              ))}
              <SelectItem value="__add__" className="text-accent font-medium">
                <Plus className="w-3 h-3 inline mr-1" /> Add contact…
              </SelectItem>
            </SelectContent>
          </Select>
          {selected && (
            <div className="mt-1 space-y-0.5">
              {selected.phone && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="w-2.5 h-2.5" /> {formatPhoneDisplay(selected.phone)}
                </div>
              )}
              {selected.email && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                  <Mail className="w-2.5 h-2.5 shrink-0" /> {selected.email}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Location dropdown with inline "+ Add location".
 */
function LocationRoleSelect({ locations, selectedId, onSave, customerId }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", street: "", city: "", state: "", zip: "" });

  const selected = locations.find(l => l.id === selectedId) || null;

  async function handleSelect(locId) {
    if (locId === "__add__") { setAdding(true); return; }
    if (locId === "__none__") { await onSave(""); return; }
    await onSave(locId);
  }

  async function handleAddLocation() {
    if (!form.street.trim() && !form.label.trim()) { toast.error("Address or label is required"); return; }
    setSaving(true);
    try {
      const fullAddress = [form.street, form.city, form.state, form.zip].filter(Boolean).join(", ");
      const newLocation = {
        id: crypto.randomUUID(),
        label: form.label.trim() || "Job Site",
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        address: fullAddress,
        display_name: form.label.trim() || "Job Site",
        created_at: new Date().toISOString(),
      };
      const updated = [...locations, newLocation];
      await base44.entities.Customer.update(customerId, { locations: updated });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      await onSave(newLocation.id);
      setForm({ label: "", street: "", city: "", state: "", zip: "" });
      setAdding(false);
      toast.success("Location added");
    } catch (e) {
      toast.error("Failed to add location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
        <MapPin className="w-3 h-3" /> Job Site
      </p>
      {adding ? (
        <div className="space-y-1.5 p-2 border rounded-md bg-muted/30">
          <Input placeholder="Label (e.g. Main Office)" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className="h-7 text-xs" />
          <Input placeholder="Street address" value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} className="h-7 text-xs" />
          <div className="grid grid-cols-2 gap-1.5">
            <Input placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="h-7 text-xs" />
            <Input placeholder="State" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className="h-7 text-xs" />
          </div>
          <Input placeholder="ZIP" value={form.zip} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} className="h-7 text-xs" />
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddLocation} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setAdding(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Select value={selectedId || "__none__"} onValueChange={handleSelect}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select location…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {locations.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label || l.display_name || l.address || "Unnamed"}
                </SelectItem>
              ))}
              <SelectItem value="__add__" className="text-accent font-medium">
                <Plus className="w-3 h-3 inline mr-1" /> Add location…
              </SelectItem>
            </SelectContent>
          </Select>
          {selected && selected.address && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{selected.address}</p>
          )}
        </>
      )}
    </div>
  );
}

export default function JobContactRolesPanel({ job, customer, onJobUpdated }) {
  const queryClient = useQueryClient();
  const contacts = customer?.contacts || [];
  const locations = customer?.locations || [];

  async function saveRole(field, contactId) {
    const updates = { [field]: contactId || "" };
    // Also denormalize site_address when location changes
    if (field === "location_id") {
      if (contactId) {
        const loc = locations.find(l => l.id === contactId);
        if (loc) updates.site_address = loc.address || [loc.street, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
      }
    }
    await base44.entities.Job.update(job.id, updates);
    queryClient.invalidateQueries({ queryKey: ["job", job.id] });
    onJobUpdated?.();
  }

  return (
    <div className="border-t border-border mt-3 pt-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <LocationRoleSelect
          locations={locations}
          selectedId={job.location_id}
          onSave={(id) => saveRole("location_id", id)}
          customerId={customer?.id}
        />
        <ContactRoleSelect
          label="Site Contact"
          icon={User}
          contacts={contacts}
          selectedId={job.site_contact_id}
          onSave={(id) => saveRole("site_contact_id", id)}
          customerId={customer?.id}
        />
        <ContactRoleSelect
          label="Drawing Approver"
          icon={User}
          contacts={contacts}
          selectedId={job.approver_contact_id}
          onSave={(id) => saveRole("approver_contact_id", id)}
          customerId={customer?.id}
        />
        <ContactRoleSelect
          label="Bill-To Contact"
          icon={User}
          contacts={contacts}
          selectedId={job.bill_to_contact_id}
          onSave={(id) => saveRole("bill_to_contact_id", id)}
          customerId={customer?.id}
        />
      </div>
    </div>
  );
}