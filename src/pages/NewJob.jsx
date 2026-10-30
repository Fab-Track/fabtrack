import React, { useState, useMemo } from "react";
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
import { generateJobNumber } from "@/lib/jobHelpers";
import CustomerCombobox from "@/components/customers/CustomerCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { useWriteOrgId } from "@/lib/orgContext";
import { useRepCandidates } from "@/hooks/useRepCandidates";
import { LEAD_SOURCES, LEAD_INTENTS, LEAD_CUSTOMER_TYPES, LEAD_BLOCKERS, autoApplyMissingInfoBlocker, deriveSizeBand } from "@/lib/salesPipeline";
import { customerTypeToLeadType } from "@/lib/customerToJob";

export default function NewJob() {
  const { user } = useAuth();
  const writeOrgId = useWriteOrgId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Read pre-filled customer from URL params (coming from Customer Profile page)
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledCustomerId = urlParams.get("customer_id") || "";
  const prefilledCustomerName = urlParams.get("customer_name") || "";

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
  });

  // Rep candidates — pulled from User entity via shared hook for consistency
  const repCandidates = useRepCandidates();

  // Find the pre-filled customer record to get site_address
  const prefilledCustomer = useMemo(() =>
    customers.find(c => c.id === prefilledCustomerId) || null,
    [customers, prefilledCustomerId]
  );

  const [form, setForm] = useState({
    job_number: generateJobNumber(),
    job_name: "",
    customer_id: prefilledCustomerId,
    customer_name: prefilledCustomerName,
    status: "Estimate",
    site_address: prefilledCustomer?.address || "",
    location_id: "",
    site_contact_id: "",
    approver_contact_id: "",
    bill_to_contact_id: "",
    expected_install_date: "",
    customer_approval_status: "pending",
    last_activity_date: new Date().toISOString(),
    assigned_rep_id: user?.id || "",
    assigned_rep_name: user?.full_name || "",
    notes_text: "",
    lead_source: "Manual",
    lead_customer_type: "",
    lead_intent: "",
    lead_blockers: [],
    next_action: "",
    next_action_date: "",
    bid_due_date: "",
    stage: "New Inquiry",
    pipeline_board: "Sales",
  });

  const selectedCustomer = useMemo(() =>
    customers.find(c => c.id === form.customer_id) || null,
    [customers, form.customer_id]
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: async (newJob) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      navigate("/jobs");
    },
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerChange = (customer) => {
    setForm(prev => ({
      ...prev,
      customer_id: customer?.id || "",
      customer_name: customer?.name || "",
      lead_customer_type: customer?.type ? customerTypeToLeadType(customer.type) : prev.lead_customer_type,
      location_id: "",
      site_contact_id: "",
      approver_contact_id: "",
      bill_to_contact_id: "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { notes_text, ...rest } = form;
    const notes = notes_text?.trim()
      ? [{
          id: crypto.randomUUID(),
          text: notes_text.trim(),
          author_id: user?.id || "",
          author_name: user?.full_name || "Unknown",
          created_at: new Date().toISOString(),
          is_todo: false,
          is_completed: false,
        }]
      : [];

    // Auto-apply Missing Info blocker if gate fields are missing at intake
    const blockers = autoApplyMissingInfoBlocker(rest, "New Inquiry");
    const payload = { ...rest, notes, organization_id: writeOrgId };
    if (blockers) payload.lead_blockers = blockers;

    // Auto-derive size band from estimate_total if present
    if (payload.estimate_total) {
      const band = deriveSizeBand(payload.estimate_total);
      if (band) payload.size_band = band;
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="p-4 md:p-6 max-w-[800px] mx-auto">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Job Board
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">Create New Job</h1>

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
                {prefilledCustomerId ? (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted text-sm">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{prefilledCustomerName}</span>
                  </div>
                ) : (
                  <CustomerCombobox
                    customers={customers}
                    value={form.customer_id}
                    onChange={handleCustomerChange}
                  />
                )}
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

            {/* Job Site */}
            <div>
              <Label className="text-xs">Job Site (from saved locations)</Label>
              <Select
                value={form.location_id || "none"}
                onValueChange={(val) => {
                  const locId = val === "none" ? "" : val;
                  const loc = selectedCustomer?.locations?.find(l => l.id === locId);
                  setForm(prev => ({
                    ...prev,
                    location_id: locId,
                    site_address: loc ? (loc.address || [loc.street, loc.city, loc.state, loc.zip].filter(Boolean).join(", ")) : prev.site_address,
                  }));
                }}
                disabled={!selectedCustomer?.locations?.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCustomer?.locations?.length ? "Select a location…" : "No saved locations for this customer"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual address below</SelectItem>
                  {selectedCustomer?.locations?.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label || l.display_name || l.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Project / Site Address</Label>
              <Input
                value={form.site_address}
                onChange={e => updateField("site_address", e.target.value)}
                placeholder="123 Main St, City, State"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Where the work will be performed. This is separate from the customer's office/billing address.</p>
            </div>

            {/* Contact Roles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Roles</p>
                <p className="text-[10px] text-muted-foreground">Assign contacts from the customer's directory to each role on this job.</p>
              </div>
              <div>
                <Label className="text-xs">Site Contact</Label>
                <Select
                  value={form.site_contact_id || "none"}
                  onValueChange={val => updateField("site_contact_id", val === "none" ? "" : val)}
                  disabled={!selectedCustomer?.contacts?.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCustomer?.contacts?.length ? "Select…" : "No contacts"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {selectedCustomer?.contacts?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Drawing Approver</Label>
                <Select
                  value={form.approver_contact_id || "none"}
                  onValueChange={val => updateField("approver_contact_id", val === "none" ? "" : val)}
                  disabled={!selectedCustomer?.contacts?.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCustomer?.contacts?.length ? "Select…" : "No contacts"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {selectedCustomer?.contacts?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Bill-To Contact</Label>
                <Select
                  value={form.bill_to_contact_id || "none"}
                  onValueChange={val => updateField("bill_to_contact_id", val === "none" ? "" : val)}
                  disabled={!selectedCustomer?.contacts?.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCustomer?.contacts?.length ? "Select…" : "No contacts"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {selectedCustomer?.contacts?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={form.notes_text}
                onChange={e => updateField("notes_text", e.target.value)}
                placeholder="Optional note to log at job creation…"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link to="/jobs">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="w-4 h-4 mr-1.5" />
            {createMutation.isPending ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </form>
    </div>
  );
}