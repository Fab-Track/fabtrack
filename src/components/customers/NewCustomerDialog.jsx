import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWriteOrgId } from "@/lib/orgContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Building2, MapPin, Ban, ChevronDown } from "lucide-react";

const LEAD_SOURCE_OPTIONS = [
  "Facebook",
  "Instagram",
  "Internet Search",
  "Referral",
  "Other",
];

const CUSTOMER_TYPES = [
  "Homeowner",
  "General Contractor",
  "Builder / Developer",
  "Commercial Business",
  "Subcontractor",
  "Other",
];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  company: "",
  job_code: "",
  lead_source: "",
  type: "",
  display_name: "",
  phone: "",
  email: "",
  address_street: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  // Contact Details
  create_contact: true,
  contact_name: "",
  contact_title: "",
  contact_email: "",
  contact_phone: "",
  // Location Details
  create_location: true,
  location_address: "",
  location_display_name: "",
  location_job_address: "",
};

export default function NewCustomerDialog({ open, onClose, onCreated, title = "New Customer" }) {
  const qc = useQueryClient();
  const writeOrgId = useWriteOrgId();
  const [form, setForm] = useState(EMPTY_FORM);

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ").trim();
  const displayOptions = useMemo(() => {
    const opts = [];
    if (fullName) opts.push(fullName);
    if (form.company) opts.push(form.company);
    return opts;
  }, [fullName, form.company]);

  // Auto-set display_name when name parts change and display_name matches a previous suggestion
  const autoDisplayName = useMemo(() => {
    if (form.display_name && form.display_name !== fullName && form.display_name !== form.company) {
      return form.display_name; // user picked something custom
    }
    if (form.type === "General Contractor" || form.type === "Commercial Business" || form.type === "Builder / Developer") {
      return form.company || fullName;
    }
    return fullName || form.company;
  }, [form.display_name, form.type, form.company, fullName]);

  const isGC = form.type === "General Contractor";
  const valid = (form.first_name.trim() || form.company.trim()) && (!isGC || form.company.trim());

  // Auto-populate contact name from full name if empty
  const effectiveContactName = form.contact_name || fullName;

  const createMutation = useMutation({
    mutationFn: async () => {
      const composedAddress = [form.address_street, form.address_city, form.address_state, form.address_zip]
        .filter(Boolean).join(", ");

      const name = autoDisplayName || fullName || form.company;

      const contacts = form.create_contact && (effectiveContactName || form.contact_email || form.contact_phone)
        ? [{
            id: crypto.randomUUID(),
            name: effectiveContactName || name,
            phone: form.contact_phone || "",
            email: form.contact_email || "",
            role: form.contact_title || "",
            created_at: new Date().toISOString(),
          }]
        : [];

      const locations = form.create_location && (form.location_address || form.location_display_name || form.location_job_address)
        ? [{
            id: crypto.randomUUID(),
            address: form.location_address || composedAddress || "",
            display_name: form.location_display_name || "",
            job_address: form.location_job_address || "",
            created_at: new Date().toISOString(),
          }]
        : [];

      const payload = {
        organization_id: writeOrgId,
        name,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        display_name: autoDisplayName || name,
        company: form.company || null,
        type: form.type || undefined,
        job_code: form.job_code || undefined,
        lead_source: form.lead_source || undefined,
        phone: form.phone || null,
        email: form.email || null,
        address: composedAddress || null,
        address_street: form.address_street || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: form.address_zip || null,
        contacts,
        locations,
      };

      // Also set job_contact fields from the contact if created
      if (form.create_contact && effectiveContactName) {
        payload.job_contact_name = effectiveContactName;
        payload.job_contact_email = form.contact_email || "";
        payload.job_contact_phone = form.contact_phone || "";
      }

      const created = await base44.entities.Customer.create(payload);
      return created;
    },
    onSuccess: (newCustomer) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      onCreated?.(newCustomer);
      setForm(EMPTY_FORM);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid || createMutation.isPending) return;
    createMutation.mutate();
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    setForm(EMPTY_FORM);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" /> {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Main Information ── */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-accent uppercase tracking-wide">Main Information</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input
                  value={form.first_name}
                  onChange={e => f("first_name", e.target.value)}
                  placeholder="Jane"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={e => f("last_name", e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            {isGC && (
              <div>
                <Label className="text-xs">Company Name *</Label>
                <Input
                  value={form.company}
                  onChange={e => f("company", e.target.value)}
                  placeholder="ABC Contractors"
                />
              </div>
            )}
            {!isGC && (
              <div>
                <Label className="text-xs">Company Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={form.company}
                  onChange={e => f("company", e.target.value)}
                  placeholder="ABC Contractors"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Job Code</Label>
                <Select value={form.job_code} onValueChange={v => f("job_code", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Lead Source</Label>
                <Select value={form.lead_source} onValueChange={v => f("lead_source", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCE_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Customer Type</Label>
              <Select value={form.type} onValueChange={v => f("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {displayOptions.length > 1 && (
              <div>
                <Label className="text-xs">Customer Display Name</Label>
                <Select
                  value={autoDisplayName}
                  onValueChange={v => f("display_name", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose display name…" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-0.5">Choose how this customer appears in lists and job cards.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <PhoneInput
                  value={form.phone}
                  onChange={e => f("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => f("email", e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Primary Address</Label>
              <Input
                value={form.address_street}
                onChange={e => f("address_street", e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Input
                  value={form.address_city}
                  onChange={e => f("address_city", e.target.value)}
                  placeholder="Provo"
                />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input
                  value={form.address_state}
                  onChange={e => f("address_state", e.target.value)}
                  placeholder="UT"
                />
              </div>
              <div>
                <Label className="text-xs">ZIP</Label>
                <Input
                  value={form.address_zip}
                  onChange={e => f("address_zip", e.target.value)}
                  placeholder="84604"
                />
              </div>
            </div>
          </div>

          {/* ── Contact Details ── */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-accent uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3 h-3" /> Contact Details
              </p>
              <button
                type="button"
                onClick={() => f("create_contact", !form.create_contact)}
                className={`text-xs font-medium flex items-center gap-1 transition-colors ${form.create_contact ? "text-muted-foreground hover:text-foreground" : "text-blue-600"}`}
              >
                <Ban className="w-3 h-3" />
                {form.create_contact ? "Don't Create a Contact" : "Create a Contact"}
              </button>
            </div>

            {form.create_contact ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={form.contact_name}
                    onChange={e => f("contact_name", e.target.value)}
                    placeholder={fullName || "Contact name"}
                  />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={form.contact_title}
                    onChange={e => f("contact_title", e.target.value)}
                    placeholder="Super, PM, HOA rep"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={e => f("contact_email", e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <PhoneInput
                    value={form.contact_phone}
                    onChange={e => f("contact_phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No contact record will be created. You can add contacts later from the customer profile.</p>
            )}
          </div>

          {/* ── Location Details ── */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-accent uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Location Details
              </p>
              <button
                type="button"
                onClick={() => f("create_location", !form.create_location)}
                className={`text-xs font-medium flex items-center gap-1 transition-colors ${form.create_location ? "text-muted-foreground hover:text-foreground" : "text-blue-600"}`}
              >
                <Ban className="w-3 h-3" />
                {form.create_location ? "Don't Create a Location" : "Create a Location"}
              </button>
            </div>

            {form.create_location ? (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-xs">Address</Label>
                  <Input
                    value={form.location_address}
                    onChange={e => f("location_address", e.target.value)}
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Display Name</Label>
                    <Input
                      value={form.location_display_name}
                      onChange={e => f("location_display_name", e.target.value)}
                      placeholder="Main Office, Job Site"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Job Address</Label>
                    <Input
                      value={form.location_job_address}
                      onChange={e => f("location_job_address", e.target.value)}
                      placeholder="456 Job Site Ave"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No location record will be created. You can add locations later from the customer profile.</p>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex gap-2 pt-2 border-t">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!valid || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}