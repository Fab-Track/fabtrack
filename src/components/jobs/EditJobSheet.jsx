import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wrench, Hash, CalendarDays, MapPin, ClipboardList, UserCheck, Building2 } from "lucide-react";
import CustomerCombobox from "@/components/customers/CustomerCombobox";

const JOB_TYPES = ["Railing", "Gate", "Fence", "Staircase", "Custom Structure", "Other"];
const BOARDS = ["Sales", "Shop", "Billing"];

export default function EditJobSheet({ open, onOpenChange, job, onSaved }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

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
        pipeline_board: job.pipeline_board || "Sales",
        stage: job.stage || "",
        assigned_rep_id: job.assigned_rep_id || "",
        customer_id: job.customer_id || "",
        customer_name: job.customer_name || "",
      });
    }
  }, [job, open]);

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  // Rep employees: estimators, admins, owners
  const repCandidates = employees.filter(e =>
    ["estimator", "admin", "owner"].includes((e.role || "").toLowerCase())
  );

  async function handleSave() {
    if (!job || !form.job_name?.trim()) return;
    setSaving(true);
    try {
      const updates = {
        job_name: form.job_name,
        job_number: form.job_number || null,
        job_type: form.job_type || null,
        expected_install_date: form.expected_install_date || null,
        site_address: form.site_address || null,
        pipeline_board: form.pipeline_board || "Sales",
        stage: form.stage || null,
        assigned_rep_id: form.assigned_rep_id || null,
        assigned_rep_name: form.assigned_rep_id
          ? employees.find(e => e.id === form.assigned_rep_id)?.name || null
          : null,
      };

      // If customer changed, update customer_id and customer_name
      if (form.customer_id !== job.customer_id) {
        updates.customer_id = form.customer_id || null;
        updates.customer_name = form.customer_id
          ? allCustomers.find(c => c.id === form.customer_id)?.name || null
          : null;
      }

      await base44.entities.Job.update(job.id, updates);
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      onSaved?.();
      onOpenChange(false);
      toast.success("Job updated.");
    } catch (err) {
      toast.error("Failed to save job.");
    } finally {
      setSaving(false);
    }
  }

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
            <div>
              <Label className="text-xs">Job Type</Label>
              <Select value={form.job_type || ""} onValueChange={val => f("job_type", val)}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
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
          <div className="flex gap-2 pt-2 sticky bottom-0 bg-background py-3 border-t">
            <Button variant="outline" className="flex-1 h-10" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 h-10" onClick={handleSave} disabled={saving || !form.job_name?.trim()}>
              {saving ? "Saving…" : "Save Job"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}