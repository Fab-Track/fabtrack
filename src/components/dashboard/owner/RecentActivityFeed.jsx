import React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { CheckCircle2, DollarSign, PlusCircle, FileText, ArrowRight } from "lucide-react";

function getJobLink(jobId) { return `/jobs/${jobId}`; }

export default function RecentActivityFeed({ jobs, invoices, estimates }) {
  const events = [];

  // Approved estimates
  (estimates || [])
    .filter(e => e.status === "Approved" && e.approved_date)
    .forEach(e => {
      const job = (jobs || []).find(j => j.id === e.job_id);
      events.push({
        icon: CheckCircle2,
        color: "text-emerald-600",
        text: `Estimate approved — ${job?.customer_name || job?.job_name || "Job"}${e.total ? ` · $${e.total.toLocaleString()}` : ""}`,
        time: e.approved_date,
        link: job ? getJobLink(job.id) : null,
      });
    });

  // Paid invoices
  (invoices || [])
    .filter(i => i.status === "Paid" && i.paid_date)
    .forEach(i => {
      events.push({
        icon: DollarSign,
        color: "text-blue-600",
        text: `Payment received on ${i.invoice_number || "invoice"} — ${i.customer_name || ""}${i.total ? ` · $${i.total.toLocaleString()}` : ""}`,
        time: i.paid_date,
        link: i.job_id ? getJobLink(i.job_id) : null,
      });
    });

  // Install completions
  (jobs || [])
    .filter(j => ["Install Complete", "Invoiced"].includes(j.status) && j.updated_date)
    .forEach(j => {
      events.push({
        icon: CheckCircle2,
        color: "text-purple-600",
        text: `Install completed — ${j.job_number ? `${j.job_number} ` : ""}${j.job_name}`,
        time: j.updated_date,
        link: getJobLink(j.id),
      });
    });

  // New jobs created
  (jobs || [])
    .filter(j => j.stage === "New Lead" && j.created_date)
    .slice(0, 10)
    .forEach(j => {
      events.push({
        icon: PlusCircle,
        color: "text-cyan-600",
        text: `New lead created — ${j.job_number ? `${j.job_number} ` : ""}${j.job_name || ""}`,
        time: j.created_date,
        link: getJobLink(j.id),
      });
    });

  // Sort by time descending, take 10
  events.sort((a, b) => new Date(b.time) - new Date(a.time));
  const recent = events.slice(0, 10);

  if (recent.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No recent activity yet.</p>;
  }

  return (
    <div className="space-y-2">
      {recent.map((ev, i) => {
        const Icon = ev.icon;
        let timeStr = "";
        try { timeStr = formatDistanceToNow(parseISO(ev.time), { addSuffix: true }); } catch {}
        const content = (
          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${ev.color}`} />
            <div className="min-w-0">
              <p className="text-xs text-foreground leading-relaxed">{ev.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{timeStr}</p>
            </div>
          </div>
        );
        return ev.link ? (
          <Link key={i} to={ev.link}>{content}</Link>
        ) : (
          <div key={i}>{content}</div>
        );
      })}
    </div>
  );
}