import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, UserSearch, Tag, User, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import CustomerCombobox from "@/components/customers/CustomerCombobox";
import EditCustomerSheet from "@/components/jobs/EditCustomerSheet";
import EditJobSheet from "@/components/jobs/EditJobSheet";

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
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  // Fetch full customer record when we have a customer_id
  const { data: customer } = useQuery({
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

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ["job", job.id] });
    onJobUpdated?.();
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
        {(displayEmail || displayPhone || displayAddress || customer?.type) && (
          <div className="flex items-start gap-5 flex-wrap pl-2 border-l border-border">
            {customer?.type && <InfoCell label="Type" icon={Tag} value={customer.type} />}
            {displayEmail && <InfoCell label="Email" icon={Mail} value={displayEmail} />}
            {displayPhone && <InfoCell label="Phone" icon={Phone} value={displayPhone} />}
            {displayAddress && <InfoCell label="Billing Address" icon={MapPin} value={displayAddress} />}
          </div>
        )}

        {/* Two edit buttons */}
        {job.customer_id && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setEditCustomerOpen(true)}
            >
              <User className="w-3.5 h-3.5" /> Edit Customer
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setEditJobOpen(true)}
            >
              <Wrench className="w-3.5 h-3.5" /> Edit Job
            </Button>
          </div>
        )}
      </div>

      {/* Edit Customer slide-out */}
      <EditCustomerSheet
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        customerId={job?.customer_id}
        jobId={job?.id}
        onSaved={handleSaved}
      />

      {/* Edit Job slide-out */}
      <EditJobSheet
        open={editJobOpen}
        onOpenChange={setEditJobOpen}
        job={job}
        onSaved={handleSaved}
      />
    </>
  );
}