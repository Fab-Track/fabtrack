import React from "react";
import { Link } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

export default function EstimatesAging({ estimates, jobs }) {
  const sent = (estimates || [])
    .filter(e => e.status === "Sent")
    .map(e => {
      const job = (jobs || []).find(j => j.id === e.job_id);
      const daysSince = e.created_date
        ? differenceInDays(new Date(), parseISO(e.created_date))
        : 0;
      return { ...e, job, daysSince };
    })
    .sort((a, b) => b.daysSince - a.daysSince);

  const handleFollowUp = async (estimate) => {
    const job = estimate.job;
    if (!job) return;
    const email = job.lead_customer_email;
    if (!email) {
      toast.error("No customer email on file for this job.");
      return;
    }
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Follow-up: Estimate for ${job.job_name}`,
        body: `Hi ${job.customer_name || "there"},\n\nI wanted to follow up on the estimate we sent for "${job.job_name}". Please let us know if you have any questions or would like to move forward.\n\nBest regards,\nHigh Country Metal Works`,
      });
      toast.success("Follow-up email sent!");
    } catch {
      toast.error("Failed to send follow-up email.");
    }
  };

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Estimates Aging <span className="text-xs font-normal">({sent.length} sent)</span>
      </h3>

      {sent.length === 0 ? (
        <p className="text-muted-foreground text-center py-6">No sent estimates awaiting response</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left font-medium pb-2 pr-4">Job</th>
                <th className="text-left font-medium pb-2 pr-4">Customer</th>
                <th className="text-right font-medium pb-2 pr-4">Amount</th>
                <th className="text-right font-medium pb-2 pr-4">Days Out</th>
                <th className="text-right font-medium pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {sent.map((est, i) => {
                const rowClass = est.daysSince >= 30
                  ? "bg-red-50 border-red-200"
                  : est.daysSince >= 14
                  ? "bg-yellow-50 border-yellow-200"
                  : "";
                return (
                  <tr key={i} className={`border-b last:border-0 ${rowClass}`}>
                    <td className="py-3 pr-4">
                      <Link to={`/jobs/${est.job_id}`} className="font-semibold hover:underline">
                        {est.job?.job_name || est.job_number || "—"}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono">{est.job_number}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{est.customer_name || est.job?.customer_name || "—"}</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {est.total ? `$${est.total.toLocaleString()}` : "—"}
                    </td>
                    <td className={`py-3 pr-4 text-right font-bold ${
                      est.daysSince >= 30 ? "text-red-600" : est.daysSince >= 14 ? "text-yellow-600" : ""
                    }`}>
                      {est.daysSince}d
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFollowUp(est)}
                        className="text-xs"
                      >
                        <Send className="w-3 h-3 mr-1" /> Follow-up
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}