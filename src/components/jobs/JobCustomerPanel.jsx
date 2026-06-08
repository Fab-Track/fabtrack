import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Pencil, Mail, Phone, MapPin, UserX, UserSearch } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import CustomerCombobox from "@/components/customers/CustomerCombobox";

// A small info cell: label + value
function InfoCell({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}{label}
      </p>
      <p className="text-sm font-medium truncate">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  );
}

export default function JobCustomerPanel({ job, onJobUpdated }) {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  // Fetch full customer record when we have a customer_id
  const { data: customer, refetch: refetchCustomer } = useQuery({
    queryKey: ["customer", job?.customer_id],
    queryFn: () => base44.entities.Customer.filter({ id: job.customer_id }).then(r => r[0]),
    enabled: !!job?.customer_id,
  });

  // Customers list for the assign combobox
  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 200),
    enabled: assignOpen,
  });

  // Sync form when customer loads or sheet opens
  useEffect(() => {
    if (customer && sheetOpen) {
      setForm({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
      });
    }
  }, [customer, sheetOpen]);

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  async function handleSave() {
    setSaving(true);
    await base44.entities.Customer.update(customer.id, {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
    });
    // Also update denormalized name on the job if name changed
    if (form.name !== customer.name) {
      await base44.entities.Job.update(job.id, { customer_name: form.name });
    }
    await refetchCustomer();
    queryClient.invalidateQueries({ queryKey: ["job", job.id] });
    onJobUpdated?.();
    setSaving(false);
    setSheetOpen(false);
    toast.success("Customer updated.");
  }

  async function handleAssign(selected) {
    await base44.entities.Job.update(job.id, {
      customer_id: selected.id,
      customer_name: selected.name,
    });
    queryClient.invalidateQueries({ queryKey: ["job", job.id] });
    onJobUpdated?.();
    setAssignOpen(false);
    toast.success(`Customer assigned: ${selected.name}`);
  }

  // — No customer linked —
  if (!job?.customer_id && !job?.customer_name) {
    return (
      <div className="mt-2">
        {assignOpen ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-64">
              <CustomerCombobox
                customers={allCustomers}
                value={null}
                onChange={handleAssign}
              />
            </div>
            <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setAssignOpen(true)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <UserSearch className="w-4 h-4" />
            <span className="underline underline-offset-2">No customer linked — Assign Customer</span>
          </button>
        )}
      </div>
    );
  }

  // Display info (use fetched customer for details, fall back to job fields)
  const displayEmail = customer?.email || null;
  const displayPhone = customer?.phone || null;
  const displayAddress = customer?.address || null;

  return (
    <>
      <div className="mt-2 flex items-start gap-4 flex-wrap">
        {/* Customer name link */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Customer:</span>
          {job.customer_id ? (
            <Link to={`/customers?id=${job.customer_id}`} className="text-sm font-semibold text-accent hover:underline">
              {job.customer_name}
            </Link>
          ) : (
            <span className="text-sm font-semibold">{job.customer_name}</span>
          )}
        </div>

        {/* Info cells — only show if customer record has data */}
        {(displayEmail || displayPhone || displayAddress) && (
          <div className="flex items-start gap-5 flex-wrap pl-2 border-l border-border">
            {displayEmail && <InfoCell label="Email" icon={Mail} value={displayEmail} />}
            {displayPhone && <InfoCell label="Phone" icon={Phone} value={displayPhone} />}
            {displayAddress && <InfoCell label="Billing Address" icon={MapPin} value={displayAddress} />}
          </div>
        )}

        {/* Edit button */}
        {job.customer_id && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={() => setSheetOpen(true)}
          >
            <Pencil className="w-3 h-3" /> Edit
          </Button>
        )}
      </div>

      {/* Edit slide-out panel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Customer
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label className="text-xs">Billing Address</Label>
              <Input value={form.address} onChange={e => f("address", e.target.value)} placeholder="123 Main St, City, State" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}