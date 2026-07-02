import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { SALES_STAGES, SALES_COLORS, daysInStage, buildStageTransition, sortColumnJobs } from "@/lib/pipelineHelpers";
import PriorityBadge from "./PriorityBadge";
import PriorityMenuItems from "./PriorityMenuItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Clock, DollarSign, AlertTriangle, MoreHorizontal, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StageTransitionDialog from "./StageTransitionDialog";
import CloseLeadModal from "@/components/jobs/CloseLeadModal";
import DeleteJobModal from "@/components/jobs/DeleteJobModal";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import { differenceInDays, parseISO } from "date-fns";

const EST_PILL = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

// ── Sales Card ─────────────────────────────────────────────────────────────────
function SalesCard({ job, isDragging, onPromote, estimates = [], onCloseLead, onDeleteJob, canDelete, stage, columnJobs, onPriorityChange }) {
  const navigate = useNavigate();
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

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`bg-card rounded-lg border p-3 hover:shadow-md transition-all ${isDragging ? "shadow-lg ring-2 ring-accent/50" : ""} ${job.is_lead_closed ? "opacity-50" : ""}`}
      onClick={() => navigate(`/jobs/${job.id}?board=Sales`)}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-[10px] font-mono text-muted-foreground">{job.job_number}</span>
        <div className="flex items-center gap-1">
          <PriorityBadge rank={job.stage_priority?.[stage]} />
          {job.job_type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.job_type}</Badge>}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className="p-0.5 rounded hover:bg-muted text-muted-foreground" onClick={e => { e.preventDefault(); e.stopPropagation(); }} onMouseDown={e => e.stopPropagation()}>
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              {!job.is_lead_closed && (
                <DropdownMenuItem onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onCloseLead(job); }}>
                  <X className="w-3.5 h-3.5 mr-2" /> Close Lead
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDeleteJob(job); }}
                >
                  Delete Job
                </DropdownMenuItem>
              )}
              <PriorityMenuItems job={job} stage={stage} columnJobs={columnJobs} onApply={onPriorityChange} closeMenu={() => setMenuOpen(false)} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Link to={`/jobs/${job.id}?board=Sales`}>
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
          onClick={e => { e.preventDefault(); e.stopPropagation(); onPromote(job); }}
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
  const [closingLead, setClosingLead] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [showClosed, setShowClosed] = useState(false);
  const [promoteRepId, setPromoteRepId] = useState(null);
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "admin");
  const isOwner = effectiveRole.toLowerCase() === "owner";
  const isEstimator = effectiveRole.toLowerCase() === "estimator";
  function canDeleteJob(job) {
    if (isOwner) return true;
    if (isEstimator && job?.stage && ["New Lead", "Estimate In Progress"].includes(job?.stage)) return true;
    return false;
  }

  // Fetch all estimates for jobs on this board to display on cards
  const jobIds = jobs.map(j => j.id);
  const { data: allEstimates = [] } = useQuery({
    queryKey: ["salesBoardEstimates", jobIds.join(",")],
    queryFn: () => base44.entities.Estimate.list("-created_date", 200),
    enabled: jobIds.length > 0,
  });
  // Fetch users with estimator or owner roles for rep credit selector
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("full_name", 200),
  });
  const estimatorReps = allUsers
    .filter(u => {
      const role = (u.role || "").toLowerCase();
      return role === "estimator" || role === "owner" || role === "admin";
    })
    .map(u => ({ id: u.id, name: u.full_name }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Fetch invoices to check for paid deposits
  const { data: allInvoices = [] } = useQuery({
    queryKey: ["salesBoardInvoices", jobIds.join(",")],
    queryFn: () => base44.entities.Invoice.list("-issued_date", 500),
    enabled: jobIds.length > 0,
  });

  // Group estimates by job_id for quick lookup
  const estimatesByJob = allEstimates.reduce((acc, e) => {
    if (!acc[e.job_id]) acc[e.job_id] = [];
    acc[e.job_id].push(e);
    return acc;
  }, {});

  // Split open vs closed leads
  const openJobs = jobs.filter(j => !j.is_lead_closed);
  const closedJobs = jobs.filter(j => j.is_lead_closed);
  const displayJobs = showClosed ? jobs : openJobs;

  const columns = {};
  SALES_STAGES.forEach(s => { columns[s] = []; });
  displayJobs.forEach(j => {
    const stage = j.stage || "New Lead";
    if (columns[stage]) columns[stage].push(j);
    else columns["New Lead"].push(j);
  });
  SALES_STAGES.forEach(s => { columns[s] = sortColumnJobs(columns[s], s); });

  const priorityMutation = useMutation({
    mutationFn: (updates) => base44.entities.Job.bulkUpdate(updates.map(u => ({ id: u.jobId, stage_priority: u.stage_priority }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const moveMutation = useMutation({
    mutationFn: ({ job, toBoard, toStage, note, repId }) => {
      const update = buildStageTransition(job, toBoard, toStage, note);
      if (repId) {
        const rep = estimatorReps.find(r => r.id === repId);
        update.assigned_rep_id = repId;
        update.assigned_rep_name = rep?.name || null;
        update.assigned_estimator = repId;
        update.assigned_estimator_name = rep?.name || null;
      }
      return base44.entities.Job.update(job.id, update);
    },
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
      setPromoteRepId(null);
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
    moveMutation.mutate({
      job: promoting,
      toBoard: "Shop",
      toStage: "New Jobs Landed — Needs Approval",
      note,
      repId: promoteRepId || null,
    });
  }

  return (
    <>
      {/* Show Closed toggle */}
      {closedJobs.length > 0 && (
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <button
            onClick={() => setShowClosed(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${showClosed ? "bg-muted text-foreground border-border" : "text-muted-foreground border-transparent hover:border-border"}`}
          >
            <span className="w-3 h-3 rounded-full bg-muted-foreground/40 inline-block" />
            {showClosed ? "Hide Closed Leads" : `Show Closed Leads (${closedJobs.length})`}
          </button>
        </div>
      )}
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
                              onCloseLead={setClosingLead}
                              onDeleteJob={setDeletingJob}
                              canDelete={canDeleteJob(job)}
                              stage={stage}
                              columnJobs={columns[stage]}
                              onPriorityChange={(updates) => priorityMutation.mutate(updates)}
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
        onClose={() => { setPromoting(null); setPromoteRepId(null); }}
        title="Move to Shop Flow?"
        message={`"${promoting?.job_name}" has a deposit. Move it to the Shop Board under "New Jobs Landed — Needs Approval"?`}
        fromStage="Deposit Received / Sale Won"
        toStage="New Jobs Landed — Needs Approval"
        toBoard="Shop"
        confirmLabel="Yes, Move to Shop"
        onConfirm={handlePromoteConfirm}
        isPending={moveMutation.isPending}
        repSelector={{
          reps: estimatorReps,
          selectedRepId: promoteRepId,
          onSelect: setPromoteRepId,
        }}
      />

      <CloseLeadModal
        open={!!closingLead}
        onClose={() => setClosingLead(null)}
        job={closingLead}
      />

      <DeleteJobModal
        open={!!deletingJob}
        onClose={() => setDeletingJob(null)}
        job={deletingJob}
        onDeleted={() => setDeletingJob(null)}
      />
    </>
  );
}