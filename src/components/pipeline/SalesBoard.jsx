import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { SALES_STAGES, SALES_COLORS, daysInStage, buildStageTransition } from "@/lib/pipelineHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Clock, DollarSign, AlertTriangle } from "lucide-react";
import StageTransitionDialog from "./StageTransitionDialog";
import { differenceInDays, parseISO } from "date-fns";

const EST_PILL = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

// ── Sales Card ─────────────────────────────────────────────────────────────────
function SalesCard({ job, isDragging, onPromote, estimates = [] }) {
  const days = daysInStage(job);
  const isStale = days > 7 && job.stage !== "Deposit Received / Sale Won";

  // Most recent estimate for this job
  const latestEst = estimates.length > 0
    ? estimates.reduce((a, b) => (a.created_date > b.created_date ? a : b))
    : null;

  // Idle estimate warning: in "Estimate In Progress" stage, estimate is Draft and >7 days old
  const showIdleWarning = latestEst?.status === "Draft"
    && job.stage === "Estimate In Progress"
    && latestEst.created_date
    && differenceInDays(new Date(), parseISO(latestEst.created_date)) > 7;

  return (
    <div className={`bg-card rounded-lg border p-3 hover:shadow-md transition-all ${isDragging ? "shadow-lg ring-2 ring-accent/50" : ""}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-[10px] font-mono text-muted-foreground">{job.job_number}</span>
        {job.job_type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.job_type}</Badge>}
      </div>
      <Link to={`/jobs/${job.id}`}>
        <h4 className="text-sm font-semibold leading-tight mb-0.5 line-clamp-2 hover:text-accent transition-colors">{job.job_name}</h4>
      </Link>
      <p className="text-xs text-muted-foreground mb-2">{job.customer_name}</p>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {latestEst && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span className="font-medium text-foreground">
              ${(latestEst.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {latestEst && (
          <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold ${EST_PILL[latestEst.status] || EST_PILL.Draft}`}>
            {latestEst.status}
          </span>
        )}
        {showIdleWarning && (
          <span title="Estimate has been sitting idle for more than 7 days">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
          </span>
        )}
        <div className={`flex items-center gap-1 ml-auto ${isStale ? "text-amber-600 font-semibold" : ""}`}>
          <Clock className="w-3 h-3" />
          <span>{days}d</span>
        </div>
      </div>

      {job.assigned_estimator_name && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
            {job.assigned_estimator_name[0]}
          </div>
          <span>{job.assigned_estimator_name}</span>
        </div>
      )}

      {job.stage === "Deposit Received / Sale Won" && (
        <Button
          size="sm"
          className="w-full mt-2 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={e => { e.preventDefault(); onPromote(job); }}
        >
          Move to Shop Flow →
        </Button>
      )}
    </div>
  );
}

// ── Sales Board ────────────────────────────────────────────────────────────────
export default function SalesBoard({ jobs = [] }) {
  const qc = useQueryClient();
  const [promoting, setPromoting] = useState(null);

  // Fetch all estimates for jobs on this board to display on cards
  const jobIds = jobs.map(j => j.id);
  const { data: allEstimates = [] } = useQuery({
    queryKey: ["salesBoardEstimates", jobIds.join(",")],
    queryFn: () => base44.entities.Estimate.list("-created_date", 200),
    enabled: jobIds.length > 0,
  });
  // Group estimates by job_id for quick lookup
  const estimatesByJob = allEstimates.reduce((acc, e) => {
    if (!acc[e.job_id]) acc[e.job_id] = [];
    acc[e.job_id].push(e);
    return acc;
  }, {});

  const columns = {};
  SALES_STAGES.forEach(s => { columns[s] = []; });
  jobs.forEach(j => {
    const stage = j.stage || "New Lead";
    if (columns[stage]) columns[stage].push(j);
    else columns["New Lead"].push(j);
  });

  const moveMutation = useMutation({
    mutationFn: ({ job, toBoard, toStage, note }) =>
      base44.entities.Job.update(job.id, buildStageTransition(job, toBoard, toStage, note)),
    onSuccess: async (_, vars) => {
      // Reverse sync: job dragged to "Estimate Sent" → update Draft estimate to Sent
      if (vars.toStage === "Estimate Sent") {
        const jobEstimates = estimatesByJob[vars.job.id] || [];
        const draftEst = jobEstimates.find(e => e.status === "Draft");
        if (draftEst) {
          await base44.entities.Estimate.update(draftEst.id, { status: "Sent" });
          qc.invalidateQueries({ queryKey: ["estimates", vars.job.id] });
        }
      }
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["salesBoardEstimates"] });
      setPromoting(null);
    },
  });

  function handleDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (!job || job.stage === newStage) return;
    moveMutation.mutate({ job, toBoard: "Sales", toStage: newStage, note: "" });
  }

  function handlePromoteConfirm(note) {
    if (!promoting) return;
    moveMutation.mutate({ job: promoting, toBoard: "Shop", toStage: "New Jobs Landed — Needs Approval", note });
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto flex-1 pb-4">
          {SALES_STAGES.map(stage => (
            <Droppable key={stage} droppableId={stage}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`shrink-0 w-64 flex flex-col rounded-xl border border-t-4 ${SALES_COLORS[stage]} ${snapshot.isDraggingOver ? "bg-accent/20" : "bg-muted/30"}`}
                >
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{stage}</span>
                    <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {columns[stage].length}
                    </span>
                  </div>
                  <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto min-h-[200px]">
                    {columns[stage].map((job, index) => (
                      <Draggable key={job.id} draggableId={job.id} index={index}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                            <SalesCard
                              job={job}
                              isDragging={snap.isDragging}
                              onPromote={setPromoting}
                              estimates={estimatesByJob[job.id] || []}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                  {/* Column total */}
                  {(() => {
                    const colTotal = columns[stage].reduce((sum, job) => {
                      const ests = estimatesByJob[job.id] || [];
                      if (ests.length === 0) return sum;
                      const latest = ests.reduce((a, b) => (a.created_date > b.created_date ? a : b));
                      return sum + (latest.total ?? 0);
                    }, 0);
                    return (
                      <div className="px-3 py-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          Total: ${colTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <StageTransitionDialog
        open={!!promoting}
        onClose={() => setPromoting(null)}
        title="Move to Shop Flow?"
        message={`"${promoting?.job_name}" has a deposit. Move it to the Shop Board under "New Jobs Landed — Needs Approval"?`}
        fromStage="Deposit Received / Sale Won"
        toStage="New Jobs Landed — Needs Approval"
        toBoard="Shop"
        confirmLabel="Yes, Move to Shop"
        onConfirm={handlePromoteConfirm}
        isPending={moveMutation.isPending}
      />
    </>
  );
}