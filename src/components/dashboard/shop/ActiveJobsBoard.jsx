import React from "react";
import { Link } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { SHOP_STAGES } from "@/lib/pipelineHelpers";

export default function ActiveJobsBoard({ jobs, timeEntries }) {
  const shopJobs = jobs
    .filter(j => j.pipeline_board === "Shop")
    .sort((a, b) => {
      const daysA = a.stage_entered_at ? differenceInDays(new Date(), parseISO(a.stage_entered_at)) : 0;
      const daysB = b.stage_entered_at ? differenceInDays(new Date(), parseISO(b.stage_entered_at)) : 0;
      return daysB - daysA;
    });

  // Hours per job
  const hoursPerJob = {};
  (timeEntries || []).forEach(t => {
    if (!hoursPerJob[t.job_id]) hoursPerJob[t.job_id] = 0;
    hoursPerJob[t.job_id] += t.duration_hours || 0;
  });

  if (shopJobs.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Active Jobs Board</h3>
        <p className="text-sm text-muted-foreground text-center py-8">No jobs currently in Shop Flow</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Active Jobs Board</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-yellow-200 border border-yellow-400" /> &gt;5 days</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-red-200 border border-red-400" /> &gt;10 days</span>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Job #</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Job Name</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">Stage</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Days in Stage</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Fabricator</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Hours</th>
            </tr>
          </thead>
          <tbody>
            {shopJobs.map(job => {
              const days = job.stage_entered_at
                ? differenceInDays(new Date(), parseISO(job.stage_entered_at))
                : 0;
              const rowBg = days > 10
                ? "bg-red-50 hover:bg-red-100"
                : days > 5
                ? "bg-yellow-50 hover:bg-yellow-100"
                : "hover:bg-muted/30";
              const daysColor = days > 10 ? "text-red-600 font-bold" : days > 5 ? "text-yellow-700 font-semibold" : "text-muted-foreground";
              const hours = (hoursPerJob[job.id] || 0).toFixed(1);
              const fabricators = (job.assigned_crew_names || []).join(", ") || "—";

              return (
                <tr key={job.id} className={`border-b last:border-b-0 transition-colors ${rowBg}`}>
                  <td className="px-3 py-2">
                    <Link to={`/jobs/${job.id}`} className="font-mono text-xs text-muted-foreground hover:text-foreground">
                      {job.job_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link to={`/jobs/${job.id}`} className="font-medium hover:text-accent">
                      {job.job_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{job.stage || "—"}</span>
                  </td>
                  <td className={`px-3 py-2 hidden lg:table-cell text-xs ${daysColor}`}>
                    {days}d
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell text-xs text-muted-foreground">
                    {fabricators}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-muted-foreground">{hours}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}