import React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isJobStalled, STATUS_COLORS } from "@/lib/jobHelpers";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Link } from "react-router-dom";

export default function StalledJobs({ jobs }) {
  const stalledJobs = jobs.filter(isJobStalled);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Stalled Jobs
        </h3>
        {stalledJobs.length > 0 && (
          <Badge variant="destructive" className="text-xs">{stalledJobs.length}</Badge>
        )}
      </div>

      {stalledJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">All jobs are active — no stalls detected</p>
      ) : (
        <div className="space-y-1.5">
          {stalledJobs.map(job => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                  <span className="text-sm font-medium truncate">{job.job_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {job.last_activity_date 
                    ? `Last activity ${formatDistanceToNow(parseISO(job.last_activity_date))} ago`
                    : "No activity recorded"
                  }
                </span>
              </div>
              <Badge className={`text-xs shrink-0 ${STATUS_COLORS[job.status] || ''}`}>
                {job.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}