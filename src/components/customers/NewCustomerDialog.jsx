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
import { User, Building2, MapPin, Ban, ChevronDown, Copy, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";
import { findCustomerMatches } from "@/lib/customerMatch";

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
  type: "",
  display_name: "",
  phone: "",
  email: "",
  address_street: "",
  address_city: "",
  address_state: "",
  address_zip: "",
  address_lat: null,
  address_lng: null,
  // Contact Details
  create_contact: false,
  contact_same_as_main: false,
  contact_name: "",
  contact_title: "",
  contact_email: "",
  contact_phone: "",
  // Location Details
  create_location: true,
  location_same_as_main: false,
  location_street: "",
  location_city: "",
  location_state: "",
  location_zip: "",
  location_lat: null,
  location_lng: null,
  location_display_name: "",
  location_job_address: "",
};

export default function NewCustomerDialog({ open, onClose, onCreated, title = "New Customer", customers = [], allJobs = [] }) {
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

  // ── Duplicate customer detection ──
  const [dismissedKey, setDismissedKey] = useState("");

  const jobCounts = useMemo(() => {
    const map = {};
    (allJobs || []).forEach(j => {
      if (j.customer_id) map[j.customer_id] = (map[j.customer_id] || 0) + 1;
    });
    return map;
  }, [allJobs]);

  const duplicateMatch = useMemo(() => {
    const sig = `${fullName}|${form.phone}|${form.email}`;
    if (sig === dismissedKey) return null;
    if (!fullName && !form.phone && !form.email) return null;
    const matches = findCustomerMatches(
      { name: fullName, phone: form.phone, email: form.email },
      customers,
      jobCounts
    );
    return matches[0] || null;
  }, [fullName, form.phone, form.email, customers, jobCounts, dismissedKey]);

  const handleUseExisting = () => {
    onCreated?.(duplicateMatch.customer);
    setForm(EMPTY_FORM);
    setDismissedKey("");
    onClose?.();
  };

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

  // Composed primary address for location "same as main"
  const composedPrimaryAddress = [form.address_street, form.address_city, form.address_state, form.address_zip]
    .filter(Boolean).join(", ");

  // Effective location fields — if "same as main" is checked, copy the primary address
  const effectiveLocationDisplayName = form.location_same_as_main ? "Primary Address" : form.location_display_name;
  const effectiveLocationJobAddress = form.location_same_as_main ? "" : form.location_job_address;

  const createMutation = useMutation({
    mutationFn: async () => {
      const composedAddress = [form.address_street, form.address_city, form.address_state, form.address_zip]
        .filter(Boolean).join(", ");

      const name = autoDisplayName || fullName || form.company;

      const cName = form.contact_same_as_main ? (fullName || name) : (effectiveContactName || name);
      const cEmail = form.contact_same_as_main ? (form.email || "") : (form.contact_email || "");
      const cPhone = form.contact_same_as_main ? (form.phone || "") : (form.contact_phone || "");

      const contacts = form.create_contact && (cEmail.trim() || cPhone.trim())
        ? [{
            id: crypto.randomUUID(),
            name: cName,
            phone: cPhone,
            email: cEmail,
            role: form.contact_title || "",
            created_at: new Date().toISOString(),
          }]
        : [];

      const locStreet = form.location_same_as_main ? form.address_street : form.location_street;
      const locCity = form.location_same_as_main ? form.address_city : form.location_city;
      const locState = form.location_same_as_main ? form.address_state : form.location_state;
      const locZip = form.location_same_as_main ? form.address_zip : form.location_zip;
      const locLat = form.location_same_as_main ? form.address_lat : form.location_lat;
      const locLng = form.location_same_as_main ? form.address_lng : form.location_lng;
      const composedLocAddr = [locStreet, locCity, locState, locZip].filter(Boolean).join(", ");
      const locDisp = form.location_same_as_main ? "Primary Address" : form.location_display_name;
      const locJob = form.location_same_as_main ? "" : form.location_job_address;

      const locations = form.create_location && (composedLocAddr || locDisp || locJob)
        ? [{
            id: crypto.randomUUID(),
            street: locStreet || "",
            city: locCity || "",
            state: locState || "",
            zip: locZip || "",
            lat: locLat || null,
            lng: locLng || null,
            address: composedLocAddr || composedAddress || "",
            display_name: locDisp || "",
            job_address: locJob || "",
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

        phone: form.phone || null,
        email: form.email || null,
        address: composedAddress || null,
        address_street: form.address_street || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_zip: form.address_zip || null,
        address_lat: form.address_lat || null,
        address_lng: form.address_lng || null,
        contacts,
        locations,
      };

      // Also set job_contact fields from the contact if created
      if (form.create_contact && cName) {
        payload.job_contact_name = cName;
        payload.job_contact_email = cEmail;
        payload.job_contact_phone = cPhone;
      }

      const created = await base44.entities.Customer.create(payload);
      return created;
    },
    onSuccess: (newCustomer) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      onCreated?.(newCustomer);
      setForm(EMPTY_FORM);
      setDismissedKey("");
      onClose?.();
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
    setDismissedKey("");
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
          {/* ── Duplicate customer warning ── */}
          {duplicateMatch && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-900">Possible existing customer</p>
                  <p className="text-sm font-medium text-amber-900">{duplicateMatch.customer.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {duplicateMatch.customer.phone && (
                      <span className="text-xs text-amber-700">{duplicateMatch.customer.phone}</span>
                    )}
                    {duplicateMatch.customer.email && (
                      <span className="text-xs text-amber-700">{duplicateMatch.customer.email}</span>
                    )}
                    {duplicateMatch.jobCount > 0 && (
                      <span className="text-xs text-amber-700 font-medium">{duplicateMatch.jobCount} job{duplicateMatch.jobCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pl-6">
                <Button type="button" size="sm" onClick={handleUseExisting}>
                  Use this customer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDismissedKey(`${fullName}|${form.phone}|${form.email}`)}
                >
                  Create new anyway
                </Button>
              </div>
            </div>
          )}

          {/* ── Main Information ── */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-accent uppercase tracking-wide">Main Information</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name</Label>
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
            <p className="text-[10px] text-muted-foreground">Either first name or company name is required.</p>

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

            <AddressAutocomplete
              values={{
                street: form.address_street,
                city: form.address_city,
                state: form.address_state,
                zip: form.address_zip,
                lat: form.address_lat,
                lng: form.address_lng,
              }}
              fieldPrefix="address_"
              onChange={f}
              placeholder="Search for the customer's address…"
              label="Primary Address"
            />
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
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={form.contact_same_as_main}
                    onCheckedChange={(checked) => f("contact_same_as_main", checked === true)}
                  />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Same as main information
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={form.contact_same_as_main ? fullName : form.contact_name}
                      onChange={e => f("contact_name", e.target.value)}
                      placeholder={fullName || "Contact name"}
                      disabled={form.contact_same_as_main}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={form.contact_title}
                      onChange={e => f("contact_title", e.target.value)}
                      placeholder="Super, PM, HOA rep"
                      disabled={form.contact_same_as_main}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={form.contact_same_as_main ? form.email : form.contact_email}
                      onChange={e => f("contact_email", e.target.value)}
                      placeholder="contact@example.com"
                      disabled={form.contact_same_as_main}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <PhoneInput
                      value={form.contact_same_as_main ? form.phone : form.contact_phone}
                      onChange={e => f("contact_phone", e.target.value)}
                      placeholder="(555) 123-4567"
                      disabled={form.contact_same_as_main}
                    />
                  </div>
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
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={form.location_same_as_main}
                    onCheckedChange={(checked) => f("location_same_as_main", checked === true)}
                  />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Same as primary address
                  </span>
                </label>
                {form.location_same_as_main ? (
                  <div>
                    <Label className="text-xs">Address</Label>
                    <p className="text-sm text-muted-foreground py-2">{composedPrimaryAddress || "No primary address set"}</p>
                  </div>
                ) : (
                  <AddressAutocomplete
                    values={{
                      street: form.location_street,
                      city: form.location_city,
                      state: form.location_state,
                      zip: form.location_zip,
                      lat: form.location_lat,
                      lng: form.location_lng,
                    }}
                    fieldPrefix="location_"
                    onChange={f}
                    placeholder="Search for the location address…"
                    label="Address"
                  />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Display Name</Label>
                    <Input
                      value={effectiveLocationDisplayName}
                      onChange={e => f("location_display_name", e.target.value)}
                      placeholder="Main Office, Job Site"
                      disabled={form.location_same_as_main}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Job Address</Label>
                    <Input
                      value={effectiveLocationJobAddress}
                      onChange={e => f("location_job_address", e.target.value)}
                      placeholder="456 Job Site Ave"
                      disabled={form.location_same_as_main}
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