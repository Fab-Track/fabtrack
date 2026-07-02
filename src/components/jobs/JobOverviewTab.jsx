import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import JobScopeSection from "@/components/jobs/JobScopeSection";
import KeyDatesCard from "@/components/jobs/KeyDatesCard";
import JobNotesSection from "@/components/jobs/JobNotesSection";
import PaymentStatusBadge from "@/components/pipeline/PaymentStatusBadge";
import { getPaymentStatus } from "@/lib/pipelineHelpers";
import { StickyNote } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";

export default function JobOverviewTab({ job, highlightNoteId }) {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "admin");
  const isFabricator = ["fabricator", "installer"].includes(effectiveRole.toLowerCase());

  const { data: jobInvoices = [] } = useQuery({
    queryKey: ["invoices", job.id],
    queryFn: () => base44.entities.Invoice.filter({ job_id: job.id }),
    enabled: !!job.id,
  });
  const paymentStatus = getPaymentStatus(jobInvoices);

  const productEntries = job.job_level_data?.product_details || [];
  const productsList = productEntries
    .map(e => e.product)
    .filter(Boolean)
    .join(", ") || null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="Products" value={productsList} />
          <DetailRow label="Site Address" value={job.site_address} />
          <DetailRow label="Payment" value={<PaymentStatusBadge status={paymentStatus} className="text-xs px-2 py-0.5" />} />
          {job.lead_outcome && (
            <DetailRow label="Lead Outcome" value={
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                job.lead_outcome === "Qualified — Won" ? "bg-emerald-100 text-emerald-800" :
                job.lead_outcome === "Qualified — Lost" ? "bg-red-100 text-red-800" :
                job.lead_outcome === "Qualified — Not Interested" ? "bg-amber-100 text-amber-800" :
                "bg-muted text-muted-foreground"
              }`}>{job.lead_outcome}</span>
            } />
          )}
          {job.lead_lost_to && (
            <DetailRow label="Lost To" value={job.lead_lost_to} />
          )}
          {job.lead_close_reason && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Close Reason</p>
              <p className="text-sm text-muted-foreground">{job.lead_close_reason}</p>
            </div>
          )}
          <DetailRow label="Assigned Rep" value={job.assigned_rep_name || "—"} />
          <DetailRow label="Customer Approval" value={
            <Badge variant={job.customer_approval_status === "approved" ? "default" : "outline"} className="text-xs">
              {job.customer_approval_status || "pending"}
            </Badge>
          } />
          {job.design_details && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Design Details</p>
              <p className="text-sm whitespace-pre-wrap">{job.design_details}</p>
            </div>
          )}
          {job.special_considerations && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Special Considerations</p>
              <p className="text-sm whitespace-pre-wrap">{job.special_considerations}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <KeyDatesCard job={job} />

      {job.internal_notes && !isFabricator && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{job.internal_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Scope — visible to all roles including fabricators */}
      <div className="md:col-span-2">
        <JobScopeSection job={job} isFabricator={isFabricator} />
      </div>

      <Card className="md:col-span-2" id="job-notes-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-muted-foreground" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <JobNotesSection job={job} highlightNoteId={highlightNoteId} />
        </CardContent>
      </Card>

    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}