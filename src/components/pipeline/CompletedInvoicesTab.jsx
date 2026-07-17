import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { CheckCircle2, DollarSign } from "lucide-react";
import JobCardCustomerInfo from "./JobCardCustomerInfo";

// Read-only list of paid/closed jobs older than 30 days — kept out of the
// active pipeline columns so the Billing board doesn't accumulate old cards.
export default function CompletedInvoicesTab({ jobs = [], invoiceMap = {}, customersById = {} }) {
  if (jobs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-16">
        No completed invoices older than 30 days yet.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-2 max-w-3xl">
        {jobs.map(job => {
          const invoice = invoiceMap[job.second_half_invoice_id];
          const paidDate = job.stage_entered_at && isValid(parseISO(job.stage_entered_at))
            ? format(parseISO(job.stage_entered_at), "MMM d, yyyy")
            : null;
          return (
            <div key={job.id} className="bg-card border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">{job.job_number}</span>
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Paid{paidDate ? ` ${paidDate}` : ""}
                  </span>
                </div>
                <Link to={`/jobs/${job.id}?board=Billing`}>
                  <h4 className="text-sm font-semibold leading-tight line-clamp-1 hover:text-accent transition-colors">{job.job_name}</h4>
                </Link>
                <JobCardCustomerInfo customerName={job.customer_name} customer={customersById[job.customer_id]} />
              </div>
              {invoice && (
                <div className="flex items-center gap-1 text-sm font-bold shrink-0">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  {(invoice.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}