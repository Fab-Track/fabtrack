import React from "react";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

export default function MarginTracker({ jobs }) {
  const activeJobs = jobs.filter(j => 
    j.status !== "Invoiced" && j.status !== "Estimate" && j.estimate_total > 0
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        Job Margins — Active Jobs
      </h3>

      {activeJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No active jobs with estimates</p>
      ) : (
        <div className="space-y-2">
          {activeJobs.slice(0, 8).map(job => {
            const costPercent = job.estimate_total > 0 
              ? Math.round((job.actual_cost || 0) / job.estimate_total * 100) 
              : 0;
            const isOverBudget = costPercent >= 80;
            
            return (
              <Link 
                key={job.id}
                to={`/jobs/${job.id}`}
                className="block px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                    <span className="text-sm font-medium truncate">{job.job_name}</span>
                    {isOverBudget && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </div>
                  <span className={`text-xs font-semibold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                    {costPercent}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(costPercent, 100)} 
                  className={`h-1.5 ${isOverBudget ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    ${(job.actual_cost || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ${(job.estimate_total || 0).toLocaleString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}