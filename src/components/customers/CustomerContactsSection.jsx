import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Phone, Mail, User } from "lucide-react";

function ContactCard({ title, name, email, phone, onEdit, emptyLabel }) {
  const hasData = name || email || phone;
  return (
    <div className="flex-1 min-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={onEdit}
        >
          <Pencil className="w-3 h-3" /> Edit
        </Button>
      </div>
      {hasData ? (
        <div className="space-y-1">
          {name && (
            <div className="flex items-center gap-1.5 text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{name}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-1.5 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-1.5 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>{phone}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">{emptyLabel}</p>
      )}
    </div>
  );
}

export default function CustomerContactsSection({ customer, onUpdated }) {
  const queryClient = useQueryClient();
  const [jobSheetOpen, setJobSheetOpen] = useState(false);
  const [billingSheetOpen, setBillingSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [jobForm, setJobForm] = useState({
    job_contact_name: customer.job_contact_name || "",
    job_contact_email: customer.job_contact_email || "",
    job_contact_phone: customer.job_contact_phone || "",
  });

  const [billingForm, setBillingForm] = useState({
    billing_contact_name: customer.billing_contact_name || "",
    billing_contact_email: customer.billing_contact_email || "",
    billing_contact_phone: customer.billing_contact_phone || "",
    billing_same_as_job: customer.billing_same_as_job !== false, // default true
  });

  async function saveJobContact() {
    setSaving(true);
    await base44.entities.Customer.update(customer.id, jobForm);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    onUpdated({ ...customer, ...jobForm });
    setSaving(false);
    setJobSheetOpen(false);
  }

  async function saveBillingContact() {
    setSaving(true);
    await base44.entities.Customer.update(customer.id, billingForm);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    onUpdated({ ...customer, ...billingForm });
    setSaving(false);
    setBillingSheetOpen(false);
  }

  const billingSameAsJob = billingForm.billing_same_as_job;

  // Effective billing contact for display
  const effectiveBillingName = billingSameAsJob ? customer.job_contact_name : customer.billing_contact_name;
  const effectiveBillingEmail = billingSameAsJob ? customer.job_contact_email : customer.billing_contact_email;
  const effectiveBillingPhone = billingSameAsJob ? customer.job_contact_phone : customer.billing_contact_phone;

  return (
    <>
      <div className="bg-card border rounded-xl p-5 mb-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Contacts</p>
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Job Contact */}
          <ContactCard
            title="Job Contact"
            name={customer.job_contact_name}
            email={customer.job_contact_email}
            phone={customer.job_contact_phone}
            emptyLabel="No job contact on file"
            onEdit={() => {
              setJobForm({
                job_contact_name: customer.job_contact_name || "",
                job_contact_email: customer.job_contact_email || "",
                job_contact_phone: customer.job_contact_phone || "",
              });
              setJobSheetOpen(true);
            }}
          />

          {/* Divider */}
          <div className="sm:border-l border-t sm:border-t-0 border-border" />

          {/* Billing Contact */}
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Contact</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={() => {
                  setBillingForm({
                    billing_contact_name: customer.billing_contact_name || "",
                    billing_contact_email: customer.billing_contact_email || "",
                    billing_contact_phone: customer.billing_contact_phone || "",
                    billing_same_as_job: customer.billing_same_as_job !== false,
                  });
                  setBillingSheetOpen(true);
                }}
              >
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            </div>

            {customer.billing_same_as_job !== false ? (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                Same as Job Contact
              </p>
            ) : (
              effectiveBillingName || effectiveBillingEmail || effectiveBillingPhone ? (
                <div className="space-y-1">
                  {effectiveBillingName && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{effectiveBillingName}</span>
                    </div>
                  )}
                  {effectiveBillingEmail && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{effectiveBillingEmail}</span>
                    </div>
                  )}
                  {effectiveBillingPhone && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{effectiveBillingPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No billing contact on file</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Job Contact Edit Sheet */}
      <Sheet open={jobSheetOpen} onOpenChange={setJobSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Job Contact
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={jobForm.job_contact_name} onChange={e => setJobForm(p => ({ ...p, job_contact_name: e.target.value }))} placeholder="Contact name" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={jobForm.job_contact_email} onChange={e => setJobForm(p => ({ ...p, job_contact_email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={jobForm.job_contact_phone} onChange={e => setJobForm(p => ({ ...p, job_contact_phone: e.target.value }))} placeholder="(555) 123-4567" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setJobSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveJobContact} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Billing Contact Edit Sheet */}
      <Sheet open={billingSheetOpen} onOpenChange={setBillingSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Billing Contact
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="billing-same"
                checked={billingForm.billing_same_as_job}
                onCheckedChange={v => setBillingForm(p => ({ ...p, billing_same_as_job: !!v }))}
              />
              <label htmlFor="billing-same" className="text-sm cursor-pointer select-none">
                Billing contact is the same as job contact
              </label>
            </div>

            {!billingForm.billing_same_as_job && (
              <>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={billingForm.billing_contact_name} onChange={e => setBillingForm(p => ({ ...p, billing_contact_name: e.target.value }))} placeholder="Billing contact name" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={billingForm.billing_contact_email} onChange={e => setBillingForm(p => ({ ...p, billing_contact_email: e.target.value }))} placeholder="billing@example.com" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={billingForm.billing_contact_phone} onChange={e => setBillingForm(p => ({ ...p, billing_contact_phone: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setBillingSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveBillingContact} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}