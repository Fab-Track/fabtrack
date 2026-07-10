import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format, parseISO, isValid, differenceInDays } from "date-fns";
import {
  ChevronDown, ChevronRight, GripVertical,
  CalendarDays, Users, Paintbrush, Clock, DollarSign,
} from "lucide-react";
import { daysInStage, buildStageTransition } from "@/lib/pipelineHelpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Muted left-border colors per stage (derived from top-border colors on kanban)
const STAGE_BORDER = {
  // Sales
  "New Lead":                      "border-l-slate-400",
  "Estimate in Progress":          "border-l-blue-400",
  "Estimate Sent":                 "border-l-blue-600",
  "Negotiation / In Review":       "border-l-amber-500",
  "Awaiting Deposit":              "border-l-orange-500",
  "Deposit Received / Sale Won":   "border-l-emerald-500",
  // Shop
  "New Jobs Landed — Needs Approval":          "border-l-slate-400",
  "On Deck for Measure":                       "border-l-sky-400",
  "Ready for Measure":                         "border-l-sky-600",
  "Needs Drawing":                             "border-l-violet-400",
  "Drawing Needs Approval":                    "border-l-violet-600",
  "On Deck for Fabrication":                   "border-l-amber-400",
  "Fabricate":                                 "border-l-amber-600",
  "Fabrication Complete — Needs Powder Coat":  "border-l-orange-400",
  "At Powder Coat":                            "border-l-orange-600",
  "Ready for Install":                         "border-l-cyan-500",
  "Install in Progress / Not Complete":        "border-l-cyan-700",
  "Install Complete":                          "border-l-emerald-500",
  // Billing
  "Needs 2nd Half Invoice Created":  "border-l-slate-400",
  "2nd Half Invoice Sent":           "border-l-blue-400",
  "10 Days Overdue":                 "border-l-yellow-400",
  "15 Days Overdue":                 "border-l-yellow-500",
  "20 Days Overdue":                 "border-l-orange-400",
  "30 Days Overdue":                 "border-l-red-500",
  "30+ Days Overdue":                "border-l-red-800",
  "Paid / Closed":                   "border-l-emerald-500",
};

function SectionHeader({ stage, count, expanded, onToggle }) {
  const border = STAGE_BORDER[stage] || "border-l-gray-400";
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-4 py-2 border-l-4 ${border} bg-muted/30 border-y border-border/40 text-left hover:bg-muted/50 transition-all`}
    >
      {expanded
        ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      <span className="text-sm font-semibold">{stage}</span>
      <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/70 text-muted-foreground border">
        {count}
      </span>
    </button>
  );
}

function PipelineJobRow({ job, index, board, readOnly = false }) {
  const days = daysInStage(job);
  const isStale = (board === "Shop" && days > 5) || (board === "Sales" && days > 7);

  const installDate = (job.promised_install_date && isValid(parseISO(job.promised_install_date)))
    ? format(parseISO(job.promised_install_date), "MMM d, yy")
    : (job.expected_install_date && isValid(parseISO(job.expected_install_date)))
      ? format(parseISO(job.expected_install_date), "MMM d, yy")
      : null;

  const overdueDays = job.invoice_sent_date && isValid(parseISO(job.invoice_sent_date))
    ? differenceInDays(new Date(), parseISO(job.invoice_sent_date))
    : null;

  return (
    <Draggable draggableId={job.id} index={index} isDragDisabled={readOnly}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group flex items-center gap-0 border-b last:border-b-0 border-border/40 bg-card transition-all
            ${snapshot.isDragging ? "shadow-lg ring-1 ring-accent/40 rounded-lg opacity-95 z-50" : "hover:bg-muted/20"}`}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className={`px-2 py-3 transition-opacity text-muted-foreground ${readOnly ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-60 cursor-grab active:cursor-grabbing"}`}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Job # */}
          <div className="w-32 shrink-0 text-xs font-mono text-muted-foreground truncate">{job.job_number || "—"}</div>

          {/* Job Name */}
          <div className="flex-1 min-w-0 pr-4">
            <Link
              to={`/jobs/${job.id}?board=${board}`}
              className="text-sm font-medium hover:text-accent transition-colors line-clamp-1"
              onClick={e => e.stopPropagation()}
            >
              {job.job_name}
            </Link>
          </div>

          {/* Customer */}
          <div className="w-36 shrink-0 text-xs text-muted-foreground truncate pr-3">{job.customer_name || "—"}</div>

          {/* Type */}
          <div className="w-28 shrink-0 pr-3">
            {job.job_type
              ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{job.job_type}</Badge>
              : <span className="text-muted-foreground/40 text-xs">—</span>}
          </div>

          {/* Install Date */}
          <div className="w-24 shrink-0 pr-3">
            {installDate
              ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="w-3 h-3 shrink-0" />{installDate}</div>
              : <span className="text-muted-foreground/30 text-xs">—</span>}
          </div>

          {/* Powder coat (Sales/Shop) or Overdue (Billing) */}
          <div className="w-32 shrink-0 pr-3">
            {board === "Billing" ? (
              overdueDays !== null && overdueDays > 0 ? (
                <span className={`text-xs font-semibold ${overdueDays >= 30 ? "text-red-700" : overdueDays >= 20 ? "text-orange-600" : "text-yellow-700"}`}>
                  {overdueDays}d overdue
                </span>
              ) : <span className="text-muted-foreground/30 text-xs">—</span>
            ) : (
              job.powder_coat_color
                ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><Paintbrush className="w-3 h-3 shrink-0" /><span className="truncate">{job.powder_coat_color}</span></div>
                : <span className="text-muted-foreground/30 text-xs">—</span>
            )}
          </div>

          {/* Crew / Estimator */}
          <div className="w-20 shrink-0 pr-3">
            {job.assigned_crew_names?.length > 0
              ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />{job.assigned_crew_names.length}</div>
              : job.assigned_estimator_name
                ? <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                      {job.assigned_estimator_name[0]}
                    </div>
                  </div>
                : <span className="text-muted-foreground/30 text-xs">—</span>}
          </div>

          {/* Days in stage */}
          <div className="w-16 shrink-0 pr-3">
            <div className={`flex items-center gap-1 text-xs ${isStale ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
              <Clock className="w-3 h-3 shrink-0" />{days}d
            </div>
          </div>

          {/* Estimate / Balance */}
          <div className="w-24 shrink-0 pr-3">
            {job.estimate_total > 0 || job.actual_cost > 0
              ? <div className="flex items-center gap-0.5 text-xs font-medium"><DollarSign className="w-3 h-3 text-muted-foreground" />{(job.estimate_total || job.actual_cost || 0).toLocaleString()}</div>
              : <span className="text-muted-foreground/30 text-xs">—</span>}
          </div>
        </div>
      )}
    </Draggable>
  );
}

/**
 * Generic pipeline row view. Works for Sales, Shop, and Billing boards.
 * Props:
 *   jobs  – filtered jobs for this board
 *   stages – ordered stage list (SALES_STAGES / SHOP_STAGES / BILLING_STAGES)
 *   board – "Sales" | "Shop" | "Billing"
 */
export default function PipelineRowView({ jobs, stages, board, readOnly = false }) {
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  // Build sections
  const [sections, setSections] = useState(() => {
    const s = {};
    stages.forEach(st => { s[st] = []; });
    jobs.forEach(j => { const st = j.stage || stages[0]; if (s[st]) s[st].push(j); });
    return s;
  });

  // Keep sections in sync when jobs prop changes (but not during drag)
  useMemo(() => {
    if (isDragging) return;
    const s = {};
    stages.forEach(st => { s[st] = []; });
    jobs.forEach(j => { const st = j.stage || stages[0]; if (s[st]) s[st].push(j); });
    setSections(s);
  }, [jobs, isDragging]);

  const moveMutation = useMutation({
    mutationFn: ({ job, toStage }) =>
      base44.entities.Job.update(job.id, buildStageTransition(job, board, toStage)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  function handleDragStart() { setIsDragging(true); }

  function handleDragEnd(result) {
    setIsDragging(false);
    if (readOnly || !result.destination) return;
    const { draggableId, source, destination } = result;
    const srcStage = source.droppableId;
    const dstStage = destination.droppableId;

    // Optimistic update
    setSections(prev => {
      const next = {};
      stages.forEach(st => { next[st] = [...(prev[st] || [])]; });
      const job = next[srcStage]?.find(j => j.id === draggableId);
      if (!job) return prev;
      next[srcStage].splice(source.index, 1);
      const updated = dstStage !== srcStage ? { ...job, stage: dstStage } : job;
      next[dstStage].splice(destination.index, 0, updated);
      return next;
    });

    if (srcStage !== dstStage) {
      const job = jobs.find(j => j.id === draggableId);
      if (job) moveMutation.mutate({ job, toStage: dstStage });
    }
  }

  const colLabel = board === "Billing" ? "Overdue" : "Powder Coat";

  return (
    <div className="flex flex-col overflow-y-auto flex-1 pb-6">
      {/* Column headers */}
      <div className="flex items-center px-4 py-2 border-b bg-muted/40 sticky top-0 z-10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="w-6 shrink-0 mr-0" />
        <div className="w-32 shrink-0">Job #</div>
        <div className="flex-1 pr-4">Job Name</div>
        <div className="w-36 shrink-0 pr-3">Customer</div>
        <div className="w-28 shrink-0 pr-3">Type</div>
        <div className="w-24 shrink-0 pr-3">Install</div>
        <div className="w-32 shrink-0 pr-3">{colLabel}</div>
        <div className="w-20 shrink-0 pr-3">Crew</div>
        <div className="w-16 shrink-0 pr-3">Age</div>
        <div className="w-24 shrink-0 pr-3">Amount</div>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {stages.map(stage => {
          const stageJobs = sections[stage] || [];
          const isCollapsed = collapsed[stage];
          return (
            <div key={stage} className="border-b border-border/30">
              <SectionHeader
                stage={stage}
                count={stageJobs.length}
                expanded={!isCollapsed}
                onToggle={() => setCollapsed(c => ({ ...c, [stage]: !c[stage] }))}
              />
              {!isCollapsed && (
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[36px] transition-colors ${snapshot.isDraggingOver ? "bg-accent/10" : ""}`}
                    >
                      {stageJobs.map((job, i) => (
                        <PipelineJobRow key={job.id} job={job} index={i} board={board} readOnly={readOnly} />
                      ))}
                      {provided.placeholder}
                      {stageJobs.length === 0 && (
                        <div className="py-2.5 px-10 text-xs text-muted-foreground/40 italic">No jobs in this stage</div>
                      )}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}