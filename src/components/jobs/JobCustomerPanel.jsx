import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, UserSearch, User, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import CustomerCombobox from "@/components/customers/CustomerCombobox";
import EditCustomerSheet from "@/components/jobs/EditCustomerSheet";
import EditJobSheet from "@/components/jobs/EditJobSheet";
import { formatPhoneDisplay } from "@/lib/phoneFormat";

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

  return (
    <>
      <div className="mt-2 flex items-center justify-between gap-4 flex-wrap">
        {/* Customer subtitle line */}
        <div className="flex items-center gap-1.5 text-sm">
          {job.customer_id ? (
            <Link to={`/customers?id=${job.customer_id}`} className="font-semibold text-accent hover:underline">
              {job.customer_name}
            </Link>
          ) : (
            <span className="font-semibold">{job.customer_name}</span>
          )}
          {customer?.company && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{customer.company}</span>
            </>
          )}
          {customer?.type && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{customer.type}</span>
            </>
          )}
        </div>

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

      {/* Divider */}
      <div className="border-t border-border mt-3 pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <InfoCell label="Site Address" icon={MapPin} value={job.site_address} />
          <InfoCell label="On-Site Contact" icon={User} value={job.onsite_contact_name} />
          <InfoCell label="On-Site Contact Phone" icon={Phone} value={job.onsite_contact_phone ? formatPhoneDisplay(job.onsite_contact_phone) : null} />
          <InfoCell label="Customer Email" icon={Mail} value={customer?.email} />
          <InfoCell label="Customer Phone" icon={Phone} value={customer?.phone ? formatPhoneDisplay(customer.phone) : null} />
        </div>
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