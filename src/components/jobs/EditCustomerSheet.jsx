import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Mail, StickyNote, Users } from "lucide-react";
import { PhoneInput } from "@/components/ui/PhoneInput";

const CUSTOMER_TYPES = [
  "Homeowner", "General Contractor", "Builder / Developer",
  "Commercial Business", "Subcontractor", "Other",
];

export default function EditCustomerSheet({ open, onOpenChange, customerId, jobId, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => base44.entities.Customer.filter({ id: customerId }).then(r => r[0]),
    enabled: !!customerId && open,
  });

  // Sync form when customer data arrives
  useEffect(() => {
    if (customer && open) {
      setForm({
        name: customer.name || "",
        company: customer.company || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        type: customer.type || "",
        billing_contact_name: customer.billing_contact_name || "",
        billing_contact_email: customer.billing_contact_email || "",
        billing_contact_phone: customer.billing_contact_phone || "",
        notes: customer.notes || "",
      });
    }
  }, [customer, open]);

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  async function handleSave() {
    if (!customer || !form.name?.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Customer.update(customer.id, {
        name: form.name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        type: form.type || null,
        billing_contact_name: form.billing_contact_name || null,
        billing_contact_email: form.billing_contact_email || null,
        billing_contact_phone: form.billing_contact_phone || null,
        notes: form.notes || null,
      });
      // Update denormalized customer name on the job if name changed
      if (form.name !== customer.name && jobId) {
        await base44.entities.Job.update(jobId, { customer_name: form.name });
      }
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      onSaved?.();
      onOpenChange(false);
      toast.success("Customer updated.");
    } catch (err) {
      toast.error("Failed to save customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4" /> Edit Customer
          </SheetTitle>
          <p className="text-xs text-muted-foreground">Changes apply to all jobs linked to this customer.</p>
        </SheetHeader>

        <div className="space-y-4 pb-8">
          {/* Basic info */}
          <fieldset className="space-y-3 border rounded-lg p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Primary Info
            </legend>
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name || ""} onChange={e => f("name", e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input value={form.company || ""} onChange={e => f("company", e.target.value)} placeholder="Company name (for contractors)" />
            </div>
            <div>
              <Label className="text-xs">Customer Type</Label>
              <Select value={form.type || ""} onValueChange={val => f("type", val)}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset className="space-y-3 border rounded-lg p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Contact
            </legend>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email || ""} onChange={e => f("email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <PhoneInput value={form.phone || ""} onChange={e => f("phone", e.target.value)} placeholder="000-000-0000" />
            </div>
            <div>
              <Label className="text-xs">Billing Address</Label>
              <Input value={form.address || ""} onChange={e => f("address", e.target.value)} placeholder="123 Main St, City, State" />
            </div>
          </fieldset>

          {/* Billing Contact */}
          <fieldset className="space-y-3 border rounded-lg p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Billing Contact
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={form.billing_contact_name || ""} onChange={e => f("billing_contact_name", e.target.value)} placeholder="Billing contact name" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.billing_contact_email || ""} onChange={e => f("billing_contact_email", e.target.value)} placeholder="billing@email.com" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <PhoneInput value={form.billing_contact_phone || ""} onChange={e => f("billing_contact_phone", e.target.value)} placeholder="000-000-0000" />
              </div>
            </div>
          </fieldset>

          {/* Notes */}
          <fieldset className="space-y-3 border rounded-lg p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Notes
            </legend>
            <Textarea
              value={form.notes || ""}
              onChange={e => f("notes", e.target.value)}
              placeholder="Internal notes about this customer…"
              rows={3}
            />
          </fieldset>

          {/* Actions */}
          <div className="flex gap-2 pt-2 sticky bottom-0 bg-background py-3 border-t">
            <Button variant="outline" className="flex-1 h-10" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-10" onClick={handleSave} disabled={saving || !form.name?.trim()}>
              {saving ? "Saving…" : "Save Customer"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}