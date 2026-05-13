import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { SALES_STAGES, SALES_COLORS, daysInStage, buildStageTransition } from "@/lib/pipelineHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Clock, DollarSign, User } from "lucide-react";
import StageTransitionDialog from "./StageTransitionDialog";

// ── Sales Card ─────────────────────────────────────────────────────────────────
function SalesCard({ job, isDragging, onPromote }) {
  const days = daysInStage(job);
  const isStale = days > 7 && job.stage !== "Deposit Received / Sale Won";

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

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {job.estimate_total > 0 && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span className="font-medium text-foreground">${job.estimate_total.toLocaleString()}</span>
          </div>
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
  const [promoting, setPromoting] = useState(null); // job being promoted

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); setPromoting(null); },
  });

  function handleDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (!job || job.stage === newStage) return;

    // If dragged into "Sale Won", just move — the button triggers the full confirm
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
                            <SalesCard job={job} isDragging={snap.isDragging} onPromote={setPromoting} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
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