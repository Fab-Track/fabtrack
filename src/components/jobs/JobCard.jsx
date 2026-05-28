import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, Paintbrush, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getJobHealth, getHealthBorder } from "@/lib/jobHelpers";
import { Link } from "react-router-dom";
import DeleteJobModal from "@/components/jobs/DeleteJobModal";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";

const PRODUCT_BADGE_COLORS = {
  Railing:      "bg-blue-100 text-blue-800 border-blue-200",
  Gate:         "bg-purple-100 text-purple-800 border-purple-200",
  Staircase:    "bg-amber-100 text-amber-800 border-amber-200",
  Structural:   "bg-slate-100 text-slate-800 border-slate-200",
  Pergola:      "bg-green-100 text-green-800 border-green-200",
  "Planter Box":"bg-lime-100 text-lime-800 border-lime-200",
  "Chimney Cap":"bg-orange-100 text-orange-800 border-orange-200",
};

function ProductBadges({ instances }) {
  if (!instances?.length) return null;
  const types = [...new Set(instances.map(i => i.product_type).filter(Boolean))];
  const visible = types.slice(0, 2);
  const extra = types.length - 2;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(t => (
        <span key={t} className={`text-[10px] px-1.5 py-0 rounded border font-medium ${PRODUCT_BADGE_COLORS[t] || "bg-muted text-muted-foreground border-border"}`}>
          {t}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] px-1.5 py-0 rounded border bg-muted text-muted-foreground border-border font-medium">
          +{extra}
        </span>
      )}
    </div>
  );
}

export default function JobCard({ job, isDragging }) {
  const health = getJobHealth(job);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "admin");
  const isOwner = effectiveRole.toLowerCase() === "owner";
  const canDelete = isOwner;

  return (
    <>
    <Link
      to={`/jobs/${job.id}`}
      className={`block bg-card rounded-lg border border-l-4 ${getHealthBorder(health)} p-3 hover:shadow-md transition-all cursor-pointer ${isDragging ? 'shadow-lg ring-2 ring-accent/50' : ''}`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
        <div className="flex items-center gap-1">
          <ProductBadges instances={job.product_instances} />
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground ml-1"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteOpen(true); }}
                >
                  Delete Job
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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

    <DeleteJobModal
      open={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      job={job}
      onDeleted={() => setDeleteOpen(false)}
    />
    </>
  );
}