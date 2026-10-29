import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import CustomerCombobox from "@/components/customers/CustomerCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/AuthContext";
import { useRepCandidates } from "@/hooks/useRepCandidates";
import { LEAD_SOURCES, LEAD_INTENTS, LEAD_CUSTOMER_TYPES, autoApplyMissingInfoBlocker, deriveSizeBand } from "@/lib/salesPipeline";
import { customerTypeToLeadType, deriveOnsiteContactFromCustomer, contactToOnsiteFields } from "@/lib/customerToJob";

export default function EditJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const jobId = window.location.pathname.split("/jobs/")[1]?.split("/edit")[0]?.split("?")[0];

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0];
    },
    enabled: !!jobId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
  });

  const repCandidates = useRepCandidates();

  const [sameAsCustomer, setSameAsCustomer] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!job) return;
    setSameAsCustomer(false);
    setForm({
      job_number: job.job_number || "",
      job_name: job.job_name || "",
      customer_id: job.customer_id || "",
      customer_name: job.customer_name || "",
      site_address: job.site_address || "",
      onsite_contact_name: job.onsite_contact_name || "",
      onsite_contact_phone: job.onsite_contact_phone || "",
      onsite_contact_email: job.onsite_contact_email || "",
      expected_install_date: job.expected_install_date || "",
      assigned_rep_id: job.assigned_rep_id || "",
      assigned_rep_name: job.assigned_rep_name || "",
      lead_source: job.lead_source || "Manual",
      lead_customer_type: job.lead_customer_type || "",
      job_type: job.job_type || "",
      lead_intent: job.lead_intent || "",
      next_action: job.next_action || "",
      next_action_date: job.next_action_date || "",
      bid_due_date: job.bid_due_date || "",
      notes_text: "",
    });
  }, [job]);

  const selectedCustomer = useMemo(
    () => customers.find(c => c.id === form?.customer_id) || null,
    [customers, form?.customer_id]
  );

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.update(jobId, data),
    onSuccess: async () => {
      // Auto-save the on-site contact to the customer's contacts directory
      if (form.customer_id && form.onsite_contact_name?.trim() && form.onsite_contact_phone?.trim()) {
        try {
          const cust = customers.find(c => c.id === form.customer_id);
          const existing = cust?.contacts || [];
          const name = form.onsite_contact_name.trim();
          const phone = form.onsite_contact_phone.trim();
          const dup = existing.some(c =>
            (c.name || "").trim().toLowerCase() === name.toLowerCase() &&
            (c.phone || "").trim() === phone
          );
          if (!dup) {
            const updatedContacts = [...existing, {
              id: crypto.randomUUID(),
              name,
              phone,
              email: "",
              role: "",
              created_at: new Date().toISOString(),
            }];
            await base44.entities.Customer.update(form.customer_id, { contacts: updatedContacts });
            queryClient.invalidateQueries({ queryKey: ["customers"] });
          }
        } catch (e) { /* non-fatal */ }
      }
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      navigate(`/jobs/${jobId}`);
    },
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = (customer) => {
    const contactFields = sameAsCustomer ? deriveOnsiteContactFromCustomer(customer) : {};
    setForm(prev => ({
      ...prev,
      customer_id: customer?.id || "",
      customer_name: customer?.name || "",
      site_address: customer?.address || prev.site_address,
      lead_customer_type: customer?.type ? customerTypeToLeadType(customer.type) : prev.lead_customer_type,
      ...contactFields,
    }));
  };

  const handleSameAsCustomer = (checked) => {
    setSameAsCustomer(checked);
    if (checked && selectedCustomer) {
      setForm(prev => ({
        ...prev,
        ...deriveOnsiteContactFromCustomer(selectedCustomer),
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form) return;
    const { notes_text, ...rest } = form;
    const notes = notes_text?.trim()
      ? [...(job.notes || []), {
          id: crypto.randomUUID(),
          text: notes_text.trim(),
          author_id: user?.id || "",
          author_name: user?.full_name || "Unknown",
          created_at: new Date().toISOString(),
          is_todo: false,
          is_completed: false,
        }]
      : (job.notes || []);

    const blockers = autoApplyMissingInfoBlocker(rest, job.stage || "New Inquiry");
    const payload = { ...rest, notes, last_activity_date: new Date().toISOString() };
    if (blockers) payload.lead_blockers = blockers;

    if (payload.estimate_total) {
      const band = deriveSizeBand(payload.estimate_total);
      if (band) payload.size_band = band;
    }

    updateMutation.mutate(payload);
  };

  if (isLoading || !form) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[800px] mx-auto">
      <Link to={`/jobs/${jobId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Job
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">Edit Job Details</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Job Number</Label>
              <Input
                value={form.job_number}
                onChange={e => updateField("job_number", e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Job Name *</Label>
              <Input
                value={form.job_name}
                onChange={e => updateField("job_name", e.target.value)}
                placeholder="e.g., Smith Residence — Custom Iron Gate"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Customer</Label>
                <CustomerCombobox
                  customers={customers}
                  value={form.customer_id}
                  onChange={handleCustomerChange}
                />
              </div>
              <div>
                <Label className="text-xs">Expected Install Date</Label>
                <Input
                  type="date"
                  value={form.expected_install_date}
                  onChange={e => updateField("expected_install_date", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Site Address</Label>
              <Input
                value={form.site_address}
                onChange={e => updateField("site_address", e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">On-Site Contact</p>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox
                  id="same-as-customer"
                  checked={sameAsCustomer}
                  onCheckedChange={handleSameAsCustomer}
                  disabled={!form.customer_id}
                />
                <Label htmlFor="same-as-customer" className="text-xs cursor-pointer">
                  Use customer's job contact for on-site contact
                </Label>
              </div>
              {selectedCustomer?.contacts?.length > 0 && !sameAsCustomer && (
                <div className="col-span-2">
                  <Label className="text-xs">Choose from saved contacts</Label>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      const c = selectedCustomer.contacts.find(c => c.id === val);
                      if (c) {
                        setForm(prev => ({
                          ...prev,
                          ...contactToOnsiteFields(c),
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved contact…" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCustomer.contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.phone ? ` — ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">On-Site Contact Name</Label>
                <Input
                  value={form.onsite_contact_name}
                  onChange={e => updateField("onsite_contact_name", e.target.value)}
                  placeholder="Contact name"
                  disabled={sameAsCustomer}
                />
              </div>
              <div>
                <Label className="text-xs">On-Site Contact Phone</Label>
                <Input
                  value={form.onsite_contact_phone}
                  onChange={e => updateField("onsite_contact_phone", e.target.value)}
                  placeholder="(555) 555-5555"
                  disabled={sameAsCustomer}
                />
              </div>
              <div>
                <Label className="text-xs">On-Site Contact Email</Label>
                <Input
                  type="email"
                  value={form.onsite_contact_email}
                  onChange={e => updateField("onsite_contact_email", e.target.value)}
                  placeholder="contact@example.com"
                  disabled={sameAsCustomer}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Assigned Rep (Sales Owner)</Label>
              <Select
                value={form.assigned_rep_id || "none"}
                onValueChange={val => {
                  const repId = val === "none" ? "" : val;
                  const emp = repCandidates.find(e => e.id === repId);
                  setForm(prev => ({
                    ...prev,
                    assigned_rep_id: repId,
                    assigned_rep_name: emp?.name || "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rep…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {repCandidates.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-0.5">This rep gets credit for all estimates and revenue on this job.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Lead Source</Label>
                <Select
                  value={form.lead_source}
                  onValueChange={val => updateField("lead_source", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source…" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Customer Type</Label>
                <Select
                  value={form.lead_customer_type || "none"}
                  onValueChange={val => updateField("lead_customer_type", val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {LEAD_CUSTOMER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Job Type</Label>
                <Select
                  value={form.job_type || "none"}
                  onValueChange={val => updateField("job_type", val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {["Railing", "Stairs", "Planters", "Gate", "Fence", "Staircase", "Custom Structure", "Other"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Buyer Intent</Label>
                <Select
                  value={form.lead_intent || "none"}
                  onValueChange={val => updateField("lead_intent", val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select intent…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {LEAD_INTENTS.map(i => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Next Action</Label>
                <Input
                  value={form.next_action}
                  onChange={e => updateField("next_action", e.target.value)}
                  placeholder="e.g., Call to follow up"
                />
              </div>
              <div>
                <Label className="text-xs">Next Action Date</Label>
                <Input
                  type="date"
                  value={form.next_action_date}
                  onChange={e => updateField("next_action_date", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Bid Due Date</Label>
              <Input
                type="date"
                value={form.bid_due_date}
                onChange={e => updateField("bid_due_date", e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Add a Note</Label>
              <Textarea
                value={form.notes_text}
                onChange={e => updateField("notes_text", e.target.value)}
                placeholder="Add a new note to the job log…"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link to={`/jobs/${jobId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-1.5" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}