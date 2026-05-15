import React from "react";
import { Link } from "react-router-dom";
import { format, parseISO, addDays, startOfDay, isWithinInterval } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UpcomingInstalls({ jobs }) {
  const now = startOfDay(new Date());
  const sevenDays = addDays(now, 7);

  const upcoming = jobs
    .filter(j => {
      if (!j.expected_install_date) return false;
      const d = parseISO(j.expected_install_date);
      return isWithinInterval(d, { start: now, end: sevenDays });
    })
    .sort((a, b) => {
      return new Date(a.expected_install_date) - new Date(b.expected_install_date);
    });

  if (upcoming.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Upcoming Installs — Next 7 Days</h3>
        <p className="text-sm text-muted-foreground text-center py-6">No installs scheduled this week</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Upcoming Installs — Next 7 Days</h3>
      <div className="space-y-2">
        {upcoming.map(job => {
          const noInstaller = job.stage === "Ready for Install" && (!job.assigned_crew || job.assigned_crew.length === 0);
          return (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className={`block rounded-lg border p-3 hover:bg-muted/30 transition-colors ${noInstaller ? "border-red-300 bg-red-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                    <span className="text-sm font-medium truncate">{job.job_name}</span>
                    {noInstaller && (
                      <Badge className="bg-red-100 text-red-700 border-red-300 text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> No Installer
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{job.customer_name}</p>
                  {(job.assigned_crew_names || []).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Crew: {job.assigned_crew_names.join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold">
                    {format(parseISO(job.expected_install_date), "EEE, MMM d")}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}