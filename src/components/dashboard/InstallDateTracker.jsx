import React from "react";
import { format, parseISO, differenceInDays, isValid } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle, Clock } from "lucide-react";
import { getJobHealth, getHealthDot } from "@/lib/jobHelpers";
import { Link } from "react-router-dom";

export default function InstallDateTracker({ jobs }) {
  const upcomingJobs = jobs
    .filter(j => {
      if (!j.expected_install_date) return false;
      if (j.status === "Invoiced" || j.status === "Install Complete") return false;
      const d = parseISO(j.expected_install_date);
      if (!isValid(d)) return false;
      return differenceInDays(d, new Date()) <= 30;
    })
    .sort((a, b) => parseISO(a.expected_install_date) - parseISO(b.expected_install_date));

  const redCount = upcomingJobs.filter(j => getJobHealth(j) === "red").length;
  const yellowCount = upcomingJobs.filter(j => getJobHealth(j) === "yellow").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          Install Dates — Next 30 Days
        </h3>
        <div className="flex gap-2">
          {redCount > 0 && (
            <Badge variant="destructive" className="text-xs">{redCount} at risk</Badge>
          )}
          {yellowCount > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">{yellowCount} watch</Badge>
          )}
        </div>
      </div>

      {upcomingJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No installs in the next 30 days</p>
      ) : (
        <div className="space-y-1.5">
          {upcomingJobs.map(job => {
            const health = getJobHealth(job);
            const daysOut = differenceInDays(parseISO(job.expected_install_date), new Date());
            return (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${getHealthDot(health)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                    <span className="text-sm font-medium truncate">{job.job_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{job.customer_name}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium">
                    {format(parseISO(job.expected_install_date), "MMM d")}
                  </div>
                  <div className={`text-xs ${daysOut < 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {daysOut < 0 ? `${Math.abs(daysOut)}d overdue` : `${daysOut}d`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}