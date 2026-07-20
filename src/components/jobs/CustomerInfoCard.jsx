import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );
}

export default function CustomerInfoCard({ job }) {
  const { data: customer } = useQuery({
    queryKey: ["customer", job.customer_id],
    queryFn: () => base44.entities.Customer.filter({ id: job.customer_id }).then(r => r[0]),
    enabled: !!job.customer_id,
  });

  if (!job.customer_id) return null;

  const billingTerms = customer?.payment_terms === "Custom"
    ? (customer?.payment_terms_custom_days ? `Custom (${customer.payment_terms_custom_days} days)` : "Custom")
    : customer?.payment_terms;

  const billingContactSameAsPrimary = customer?.billing_same_as_primary;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Customer Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="Name" value={customer?.name} />
        <Row label="Company" value={customer?.company} />
        <Row label="Customer Type" value={customer?.type} />
        <Row label="Address" value={customer?.address} />
        <Row label="Email" value={customer?.email} />
        <Row label="Phone" value={customer?.phone} />

        <div className="pt-2 border-t space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Billing Contact</p>
          <Row label="Name" value={billingContactSameAsPrimary ? customer?.name : customer?.billing_contact_name} />
          <Row label="Address" value={billingContactSameAsPrimary ? customer?.address : customer?.billing_contact_address} />
          <Row label="Email" value={billingContactSameAsPrimary ? customer?.email : customer?.billing_contact_email} />
          <Row label="Phone" value={billingContactSameAsPrimary ? customer?.phone : customer?.billing_contact_phone} />
        </div>

        <div className="pt-2 border-t space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Billing Details</p>
          <Row label="Billing Terms" value={billingTerms} />
          <Row label="Submission Deadline" value={customer?.billing_deadline_date} />
        </div>

        {customer?.notes && (
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}