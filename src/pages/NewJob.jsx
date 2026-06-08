import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { generateJobNumber } from "@/lib/jobHelpers";
import CustomerCombobox from "@/components/customers/CustomerCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Read pre-filled customer from URL params (coming from Customer Profile page)
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledCustomerId = urlParams.get("customer_id") || "";
  const prefilledCustomerName = urlParams.get("customer_name") || "";

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 100),
  });

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
    expected_install_date: "",
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

            <div>
              <Label className="text-xs">Customer Type</Label>
              <Select value={form.customer_type || ""} onValueChange={val => updateField("customer_type", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Homeowner">Homeowner</SelectItem>
                  <SelectItem value="General Contractor">General Contractor</SelectItem>
                  <SelectItem value="Builder / Developer">Builder / Developer</SelectItem>
                  <SelectItem value="Commercial Business">Commercial Business</SelectItem>
                  <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
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