import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { SHOP_STAGES, SHOP_COLORS, daysInStage, buildStageTransition } from "@/lib/pipelineHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Clock, CalendarDays, Paintbrush, Users } from "lucide-react";
import StageTransitionDialog from "./StageTransitionDialog";
import { format, parseISO, isValid } from "date-fns";

// ── Shop Card ──────────────────────────────────────────────────────────────────
function ShopCard({ job, isDragging, onComplete, readOnly = false }) {
  const days = daysInStage(job);
  const isStale = days > 5;
  const installDate = job.promised_install_date && isValid(parseISO(job.promised_install_date))
    ? format(parseISO(job.promised_install_date), "MMM d")
    : job.expected_install_date && isValid(parseISO(job.expected_install_date))
      ? format(parseISO(job.expected_install_date), "MMM d")
      : null;

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
        {installDate && (
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            <span>{installDate}</span>
          </div>
        )}
        {job.powder_coat_color && (
          <div className="flex items-center gap-1">
            <Paintbrush className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{job.powder_coat_color}</span>
          </div>
        )}
        <div className={`flex items-center gap-1 ml-auto ${isStale ? "text-amber-600 font-semibold" : ""}`}>
          <Clock className="w-3 h-3" />
          <span>{days}d</span>
        </div>
      </div>

      {job.assigned_crew_names?.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <div className="flex gap-0.5">
            {job.assigned_crew_names.slice(0, 3).map((name, i) => (
              <div key={i} className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary" title={name}>
                {name[0]}
              </div>
            ))}
          </div>
        </div>
      )}

      {job.stage === "Install Complete" && !readOnly && (
        <Button
          size="sm"
          className="w-full mt-2 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={e => { e.preventDefault(); onComplete(job); }}
        >
          Move to Billing →
        </Button>
      )}
    </div>
  );
}

// ── Shop Board ─────────────────────────────────────────────────────────────────
export default function ShopBoard({ jobs = [], readOnly = false }) {
  const qc = useQueryClient();
  const [completing, setCompleting] = useState(null);

  const columns = {};
  SHOP_STAGES.forEach(s => { columns[s] = []; });
  jobs.forEach(j => {
    const stage = j.stage || "New Jobs Landed — Needs Approval";
    if (columns[stage]) columns[stage].push(j);
    else columns["New Jobs Landed — Needs Approval"].push(j);
  });

  const moveMutation = useMutation({
    mutationFn: ({ job, toBoard, toStage, note }) =>
      base44.entities.Job.update(job.id, buildStageTransition(job, toBoard, toStage, note)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); setCompleting(null); },
  });

  function handleDragEnd(result) {
    if (readOnly || !result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (!job || job.stage === newStage) return;
    moveMutation.mutate({ job, toBoard: "Shop", toStage: newStage, note: "" });
  }

  function handleBillingConfirm(note) {
    if (!completing) return;
    moveMutation.mutate({ job: completing, toBoard: "Billing", toStage: "Needs 2nd Half Invoice Created", note });
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto flex-1 pb-4">
          {SHOP_STAGES.map(stage => (
            <Droppable key={stage} droppableId={stage}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`shrink-0 w-64 flex flex-col rounded-xl border border-t-4 ${SHOP_COLORS[stage]} ${snapshot.isDraggingOver ? "bg-accent/20" : "bg-muted/30"}`}
                >
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{stage}</span>
                    <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {columns[stage].length}
                    </span>
                  </div>
                  <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto min-h-[200px]">
                    {columns[stage].map((job, index) => (
                      <Draggable key={job.id} draggableId={job.id} index={index} isDragDisabled={readOnly}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...(!readOnly ? prov.dragHandleProps : {})}>
                            <ShopCard job={job} isDragging={snap.isDragging} onComplete={readOnly ? undefined : setCompleting} readOnly={readOnly} />
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
        open={!!completing}
        onClose={() => setCompleting(null)}
        title="Mark Install Complete & Move to Billing?"
        message={`"${completing?.job_name}" — install is complete. Move to the Billing Board to create the 2nd half invoice?`}
        fromStage="Install Complete"
        toStage="Needs 2nd Half Invoice Created"
        toBoard="Billing"
        confirmLabel="Yes, Move to Billing"
        onConfirm={handleBillingConfirm}
        isPending={moveMutation.isPending}
      />
    </>
  );
}