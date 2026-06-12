import React from "react";
import { Link } from "react-router-dom";
import { differenceInDays, format, parseISO, isValid } from "date-fns";
import { GripVertical, Clock, ArrowRight } from "lucide-react";
import ApprovalReminderButton from "./ApprovalReminderButton";
import { daysInStage } from "@/lib/pipelineHelpers";

const STAGE_COLORS = {
  "On Deck for Measure":     "bg-sky-100 text-sky-700 border-sky-200",
  "Ready for Measure":       "bg-sky-200 text-sky-800 border-sky-300",
  "Needs Drawing":           "bg-violet-100 text-violet-700 border-violet-200",
  "Drawing Needs Approval":  "bg-red-100 text-red-700 border-red-200",
};

export default function DesignQueueItem({ job, isManual, dragHandleProps = {}, isDragging }) {
  const today = new Date();

  const dateStr = job.promised_install_date || job.expected_install_date;
  const dueDate = dateStr && isValid(parseISO(dateStr)) ? parseISO(dateStr) : null;
  const daysUntilDue = dueDate ? differenceInDays(dueDate, today) : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

  const aging = daysInStage(job);

  const isAwaitingApproval = job.stage === "Drawing Needs Approval";

  return (
    <div
      className={`
        flex items-start gap-2 p-3 rounded-lg border bg-card transition-shadow
        ${isDragging ? "shadow-lg ring-2 ring-primary/30 opacity-90" : "hover:shadow-sm"}
        ${isAwaitingApproval ? "border-red-200 bg-red-50/40" : ""}
      `}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{job.job_name}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{job.job_number}</p>
          </div>
          {isManual && (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
              Manual
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {job.job_type && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border font-medium">
              {job.job_type}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${STAGE_COLORS[job.stage] || "bg-muted text-muted-foreground border-border"}`}>
            {job.stage}
          </span>

          {/* Due date */}
          {dueDate && (
            <span className={`text-[10px] font-medium ${isOverdue ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
              {isOverdue
                ? `${Math.abs(daysUntilDue)}d overdue`
                : daysUntilDue === 0
                  ? "Due today"
                  : `Due ${format(dueDate, "MMM d")}`}
            </span>
          )}

          {/* Stage aging */}
          {aging > 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] ${aging >= 7 ? "text-orange-600 font-semibold" : "text-muted-foreground"}`}>
              <Clock className="w-2.5 h-2.5" />
              {aging}d in stage
            </span>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="shrink-0 flex flex-col items-end gap-1.5 ml-1">
        {isAwaitingApproval && <ApprovalReminderButton job={job} />}
        <Link to={`/jobs/${job.id}`} className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline font-medium whitespace-nowrap">
          View Job <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}