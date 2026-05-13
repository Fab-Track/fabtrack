import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { generateJobNumber } from "@/lib/jobHelpers";
import CustomerCombobox from "@/components/customers/CustomerCombobox";

export default function NewJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 100),
  });

  const [form, setForm] = useState({
    job_number: generateJobNumber(),
    job_name: "",
    job_type: "",
    customer_id: "",
    customer_name: "",
    status: "Estimate",
    site_address: "",
    expected_install_date: "",
    design_details: "",
    powder_coat_color: "",
    powder_coat_code: "",
    special_considerations: "",
    internal_notes: "",
    customer_approval_status: "pending",
    last_activity_date: new Date().toISOString(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: (newJob) => {
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
      site_address: customer?.address || prev.site_address,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Job Number</Label>
                <Input value={form.job_number} readOnly className="bg-muted font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs">Job Type</Label>
                <Select value={form.job_type} onValueChange={v => updateField("job_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {["Fence", "Gate", "Railing", "Staircase", "Custom Structure", "Other"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Fabrication Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Powder Coat Color</Label>
                <Input 
                  value={form.powder_coat_color} 
                  onChange={e => updateField("powder_coat_color", e.target.value)}
                  placeholder="e.g., Satin Black"
                />
              </div>
              <div>
                <Label className="text-xs">RAL / Color Code</Label>
                <Input 
                  value={form.powder_coat_code} 
                  onChange={e => updateField("powder_coat_code", e.target.value)}
                  placeholder="e.g., RAL 9005"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Design Details</Label>
              <Textarea 
                value={form.design_details} 
                onChange={e => updateField("design_details", e.target.value)}
                placeholder="Describe the design, materials, dimensions..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-xs">Special Considerations</Label>
              <Textarea 
                value={form.special_considerations} 
                onChange={e => updateField("special_considerations", e.target.value)}
                placeholder="Access issues, timing constraints, site conditions..."
                rows={2}
              />
            </div>

            <div>
              <Label className="text-xs">Internal Notes</Label>
              <Textarea 
                value={form.internal_notes} 
                onChange={e => updateField("internal_notes", e.target.value)}
                placeholder="Notes visible only to shop staff..."
                rows={2}
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