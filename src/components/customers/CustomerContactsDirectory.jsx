import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Pencil, Phone, Mail, User, Plus, Trash2, Briefcase } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/phoneFormat";

export default function CustomerContactsDirectory({ customer, onUpdated }) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "" });
  const [saving, setSaving] = useState(false);

  const contacts = customer.contacts || [];

  function openAdd() {
    setEditId(null);
    setForm({ name: "", phone: "", email: "", role: "" });
    setSheetOpen(true);
  }

  function openEdit(c) {
    setEditId(c.id);
    setForm({ name: c.name || "", phone: c.phone || "", email: c.email || "", role: c.role || "" });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    let updatedContacts;
    const entry = {
      id: editId || crypto.randomUUID(),
      name: form.name.trim(),
      phone: form.phone || "",
      email: form.email || "",
      role: form.role || "",
      created_at: editId
        ? (contacts.find(c => c.id === editId)?.created_at || new Date().toISOString())
        : new Date().toISOString(),
    };
    if (editId) {
      updatedContacts = contacts.map(c => c.id === editId ? entry : c);
    } else {
      updatedContacts = [...contacts, entry];
    }
    await base44.entities.Customer.update(customer.id, { contacts: updatedContacts });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    onUpdated({ ...customer, contacts: updatedContacts });
    setSaving(false);
    setSheetOpen(false);
  }

  async function handleDelete(id) {
    const updatedContacts = contacts.filter(c => c.id !== id);
    await base44.entities.Customer.update(customer.id, { contacts: updatedContacts });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    onUpdated({ ...customer, contacts: updatedContacts });
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contacts Directory</p>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={openAdd}>
          <Plus className="w-3 h-3" /> Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No contacts saved yet. Contacts are added automatically when you create jobs with an on-site contact.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contacts.map(c => (
            <div key={c.id} className="border rounded-lg p-3 bg-muted/30 group relative">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm min-w-0">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(c)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {c.role && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Briefcase className="w-3 h-3" /> {c.role}
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-1.5 text-sm mt-1">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{formatPhoneDisplay(c.phone)}</span>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-1.5 text-sm mt-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> {editId ? "Edit Contact" : "Add Contact"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Contact name" />
            </div>
            <div>
              <Label className="text-xs">Role / Title</Label>
              <Input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Super, PM, HOA rep" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <PhoneInput value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="000-000-0000" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name?.trim() || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}