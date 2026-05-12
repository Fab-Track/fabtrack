import React from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, Paintbrush } from "lucide-react";
import { getJobHealth, getHealthBorder } from "@/lib/jobHelpers";
import { Link } from "react-router-dom";

export default function JobCard({ job, isDragging }) {
  const health = getJobHealth(job);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className={`block bg-card rounded-lg border border-l-4 ${getHealthBorder(health)} p-3 hover:shadow-md transition-all cursor-pointer ${isDragging ? 'shadow-lg ring-2 ring-accent/50' : ''}`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
        {job.job_type && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.job_type}</Badge>
        )}
      </div>

      <h4 className="text-sm font-semibold leading-tight mb-1 line-clamp-2">{job.job_name}</h4>
      <p className="text-xs text-muted-foreground mb-2">{job.customer_name}</p>

      <div className="flex flex-wrap gap-1.5">
        {job.expected_install_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            {format(parseISO(job.expected_install_date), "MMM d")}
          </div>
        )}
        {job.powder_coat_color && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Paintbrush className="w-3 h-3" />
            {job.powder_coat_color}
          </div>
        )}
        {job.assigned_crew_names?.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {job.assigned_crew_names.length}
          </div>
        )}
      </div>
    </Link>
  );
}