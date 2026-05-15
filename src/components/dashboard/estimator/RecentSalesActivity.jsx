import React from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { UserPlus, FileText, CheckCircle, DollarSign, XCircle } from "lucide-react";

const EVENT_CONFIG = {
  "New Lead":           { icon: UserPlus,     color: "text-blue-500",   bg: "bg-blue-50",   label: "New lead received" },
  "Estimate Sent":      { icon: FileText,     color: "text-indigo-500", bg: "bg-indigo-50", label: "Estimate sent" },
  "Approved":           { icon: CheckCircle,  color: "text-green-500",  bg: "bg-green-50",  label: "Estimate approved" },
  "Deposit Received":   { icon: DollarSign,   color: "text-accent",     bg: "bg-amber-50",  label: "Deposit received" },
  "Rejected":           { icon: XCircle,      color: "text-red-500",    bg: "bg-red-50",    label: "Estimate declined" },
};

export default function RecentSalesActivity({ jobs, estimates }) {
  // Build event feed from stage history of Sales jobs + estimate status changes
  const events = [];

  (jobs || []).forEach(job => {
    if (job.pipeline_board !== "Sales") return;
    // New Lead event
    if (job.created_date) {
      events.push({
        type: "New Lead",
        timestamp: job.created_date,
        job_id: job.id,
        job_name: job.job_name,
        job_number: job.job_number,
        customer_name: job.customer_name,
      });
    }
    // Stage history events
    (job.stage_history || []).forEach(h => {
      if (h.to_stage && EVENT_CONFIG[h.to_stage] && h.timestamp) {
        events.push({
          type: h.to_stage,
          timestamp: h.timestamp,
          job_id: job.id,
          job_name: job.job_name,
          job_number: job.job_number,
          customer_name: job.customer_name,
        });
      }
    });
  });

  // Estimate Sent events from estimates
  (estimates || []).forEach(est => {
    if (est.status === "Sent" && est.created_date) {
      events.push({
        type: "Estimate Sent",
        timestamp: est.created_date,
        job_id: est.job_id,
        job_name: est.job_name,
        job_number: est.job_number,
        customer_name: est.customer_name,
      });
    }
  });

  const sorted = events
    .filter(e => e.timestamp && EVENT_CONFIG[e.type])
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Recent Sales Activity</h3>

      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-center py-6">No recent sales activity</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((event, i) => {
            const cfg = EVENT_CONFIG[event.type];
            const Icon = cfg.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{cfg.label}</span>
                    {event.job_id && (
                      <>
                        {" — "}
                        <Link to={`/jobs/${event.job_id}`} className="text-accent hover:underline font-medium">
                          {event.job_name || event.job_number}
                        </Link>
                      </>
                    )}
                  </p>
                  {event.customer_name && (
                    <p className="text-xs text-muted-foreground">{event.customer_name}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(parseISO(event.timestamp), { addSuffix: true })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}