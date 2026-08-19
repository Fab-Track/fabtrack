import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wrench, Hash, CalendarDays, MapPin, ClipboardList, UserCheck, Building2, Save, Loader2, Check } from "lucide-react";
import CustomerCombobox from "@/components/customers/CustomerCombobox";
import { Checkbox } from "@/components/ui/checkbox";
import { SHOP_STAGES } from "@/lib/pipelineHelpers";
import { useAutosave } from "@/hooks/useAutosave";

const JOB_TYPES = ["Railing", "Gate", "Fence", "Staircase", "Custom Structure", "Other"];
const BOARDS = ["Sales", "Shop", "Billing"];

export default function EditJobSheet({ open, onOpenChange, job, onSaved }) {
  const qc = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState({});
  const [sameAsCustomer, setSameAsCustomer] = useState(false);

  const selectedCustomer = allCustomers.find(c => c.id === form.customer_id) || null;

  // Employees for rep assignment
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
    enabled: open,
  });

  // Customers for reassignment
  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 200),
    enabled: open,
  });

  // Sync form when job changes or sheet opens
  useEffect(() => {
    if (job && open) {
      setForm({
        job_name: job.job_name || "",
        job_number: job.job_number || "",
        job_type: job.job_type || "",
        expected_install_date: job.expected_install_date || "",
        site_address: job.site_address || "",
        onsite_contact_name: job.onsite_contact_name || "",
        onsite_contact_phone: job.onsite_contact_phone || "",
        pipeline_board: job.pipeline_board || "Sales",
        stage: job.stage || "",
        assigned_rep_id: job.assigned_rep_id || "",
        customer_id: job.customer_id || "",
        customer_name: job.customer_name || "",
      });
    }
  }, [job, open]);

  const f = (field, val) => {
    setDirty(true);
    setForm(p => ({ ...p, [field]: val }));
  };

  // Rep employees: estimators, admins, owners
  const repCandidates = employees.filter(e =>
    ["estimator", "admin", "owner"].includes((e.role || "").toLowerCase())
  );

  const enabled = !!job && !!form.job_name?.trim();

  const onSave = async (formData) => {
    if (!job) return;
    // Shop flow validation — throws to prevent saving without an invoice
    const enteringShop = formData.pipeline_board === "Shop" && !SHOP_STAGES.includes(job.stage);
    if (enteringShop) {
      const jobInvoices = await base44.entities.Invoice.filter({ job_id: job.id });
      if (!jobInvoices.length) {
        throw new Error("An invoice must be created before this job can move to Shop Flow.");
      }
    }
    const updates = {
      job_name: formData.job_name,
      job_number: formData.job_number || null,
      job_type: formData.job_type || null,
      expected_install_date: formData.expected_install_date || null,
      site_address: formData.site_address || null,
      onsite_contact_name: formData.onsite_contact_name || null,
      onsite_contact_phone: formData.onsite_contact_phone || null,
      pipeline_board: formData.pipeline_board || "Sales",
      stage: formData.stage || null,
      assigned_rep_id: formData.assigned_rep_id || null,
      assigned_rep_name: formData.assigned_rep_id
        ? employees.find(e => e.id === formData.assigned_rep_id)?.name || null
        : null,
    };

    // If customer changed, update customer_id and customer_name
    if (formData.customer_id !== job.customer_id) {
      updates.customer_id = formData.customer_id || null;
      updates.customer_name = formData.customer_id
        ? allCustomers.find(c => c.id === formData.customer_id)?.name || null
        : null;
    }

    await base44.entities.Job.update(job.id, updates);
    qc.invalidateQueries({ queryKey: ["job", job.id] });
    onSaved?.();
  };

  const { isSaving, saveNow } = useAutosave({
    data: form,
    dirty,
    onSave,
    onSaved: () => setDirty(false),
    enabled,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Wrench className="w-4 h-4" /> Edit Job
          </SheetTitle>
          <p className="text-xs text-muted-foreground">Changes affect only this job.</p>
        </SheetHeader>

        <div className="space-y-4 pb-8">
          {/* Core job info */}
          <fieldset className="space-y-3 border rounded-lg p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Job Details
            </legend>
            <div>
              <Label className="text-xs">Job Name *</Label>
              <Input value={form.job_name || ""} onChange={e => f("job_name", e.target.value)} placeholder="Job name" />
            </div>
            <div>
              <Label className="text-xs">Job Number</Label>
              <Input value={form.job_number || ""} onChange={e => f("job_number", e.target.value)} placeholder="HCMW-2025-001" />
            </div>
          </fieldset>

          {/* Location & dates */}
          <fieldset className="space-y-3 border rounded-lg p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location & Date
            </legend>
            <div>
              <Label className="text-xs">Site Address</Label>
              <Input value={form.site_address || ""} onChange={e => f("site_address", e.target.value)} placeholder="123 Main St, City, State" />
            </div>
            <div>
              <Label className="text-xs">Expected Install Date</Label>
              <Input type="date" value={form.expected_install_date || ""} onChange={e => f("expected_install_date", e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="same-as-customer-edit"
                checked={sameAsCustomer}
                onCheckedChange={(checked) => {
                  setSameAsCustomer(checked);
                  if (checked && selectedCustomer) {
                    setDirty(true);
                    setForm(prev => ({
                      ...prev,
                      onsite_contact_name: selectedCustomer.job_contact_name || selectedCustomer.name || "",
                      onsite_contact_phone: selectedCustomer.job_contact_phone || selectedCustomer.phone || "",
                    }));
                  }
                }}
                disabled={!form.customer_id}
              />
              <Label htmlFor="same-as-customer-edit" className="text-xs cursor-pointer">
                Use customer's job contact for on-site contact
              </Label>
            </div>
            <div>
              <Label className="text-xs">On-Site Contact Name</Label>
              <Input value={form.onsite_contact_name || ""} onChange={e => f("onsite_contact_name", e.target.value)} placeholder="Contact name" disabled={sameAsCustomer} />
            </div>
            <div>
              <Label className="text-xs">On-Site Contact Phone</Label>
              <Input value={form.onsite_contact_phone || ""} onChange={e => f("onsite_contact_phone", e.target.value)} placeholder="(555) 555-5555" disabled={sameAsCustomer} />
            </div>
          </fieldset>

          {/* Board & Stage */}
          <fieldset className="space-y-3 border rounded-lg p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Pipeline
            </legend>
            <div>
              <Label className="text-xs">Board</Label>
              <Select value={form.pipeline_board || "Sales"} onValueChange={val => f("pipeline_board", val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Stage</Label>
              <Input value={form.stage || ""} onChange={e => f("stage", e.target.value)} placeholder="e.g. New Lead, Fab Queue…" />
            </div>
          </fieldset>

          {/* Ownership */}
          <fieldset className="space-y-3 border rounded-lg p-3">
            <legend className="text-xs font-semibold text-muted-foreground px-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Ownership
            </legend>
            <div>
              <Label className="text-xs">Assigned Rep (Sales Owner)</Label>
              <Select value={form.assigned_rep_id || ""} onValueChange={val => f("assigned_rep_id", val)}>
                <SelectTrigger><SelectValue placeholder="Select rep…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {repCandidates.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Linked Customer</Label>
              <CustomerCombobox
                customers={allCustomers}
                value={form.customer_id || null}
                onChange={(selected) => {
                  f("customer_id", selected?.id || "");
                  f("customer_name", selected?.name || "");
                }}
              />
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 sticky bottom-0 bg-background py-3 border-t">
            <Button variant="outline" className="h-9" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {isSaving ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </span>
            ) : dirty ? (
              <Button
                className="h-9 gap-1.5"
                onClick={async () => {
                  try { await saveNow(); } catch (e) {
                    toast.error(e?.message || "Failed to save job.");
                  }
                }}
                disabled={!form.job_name?.trim()}
              >
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}