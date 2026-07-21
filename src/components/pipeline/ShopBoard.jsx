import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { SHOP_STAGES, SHOP_COLORS, daysInStage, buildStageTransition, SALES_STAGES, BILLING_STAGES, sortColumnJobs, closePriorityGap, reorderColumnPriority, getPaymentStatus } from "@/lib/pipelineHelpers";
import PriorityBadge from "./PriorityBadge";
import PriorityMenuItems from "./PriorityMenuItems";
import PaymentStatusBadge from "./PaymentStatusBadge";
import JobCardCustomerInfo from "./JobCardCustomerInfo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Clock, CalendarDays, Paintbrush, Users, MoreHorizontal, Archive, Trash2, ArrowRightLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StageTransitionDialog from "./StageTransitionDialog";
import ScopeReviewDialog from "./ScopeReviewDialog";
import DeleteJobModal from "@/components/jobs/DeleteJobModal";
import { toast } from "sonner";
import { format, parseISO, isValid } from "date-fns";

const FLOWS = { Sales: SALES_STAGES, Shop: SHOP_STAGES, Billing: BILLING_STAGES };

// ── Shop Card ──────────────────────────────────────────────────────────────────
function ShopCard({ job, isDragging, onComplete, readOnly = false, stage, columnJobs, onPriorityChange, invoices = [], customer, onFabReview }) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const qc = useQueryClient();
  const days = daysInStage(job);
  const paymentStatus = getPaymentStatus(invoices);
  const isStale = days > 5;
  const installDate = job.promised_install_date && isValid(parseISO(job.promised_install_date))
    ? format(parseISO(job.promised_install_date), "MMM d")
    : job.expected_install_date && isValid(parseISO(job.expected_install_date))
      ? format(parseISO(job.expected_install_date), "MMM d")
      : null;

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Job.update(job.id, { is_archived: true, archived_at: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Job archived"); },
    onError: (err) => toast.error(err?.message || "Failed to archive"),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ toBoard, toStage }) => {
      const payload = buildStageTransition(job, toBoard, toStage);
      await base44.entities.Job.update(job.id, payload);
      const gapUpdates = closePriorityGap(columnJobs, stage, job.id);
      if (gapUpdates.length) {
        await base44.entities.Job.bulkUpdate(gapUpdates.map(u => ({ id: u.jobId, stage_priority: u.stage_priority })));
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Job moved"); },
    onError: (err) => toast.error(err?.message || "Failed to move job"),
  });

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
    <div
      className={`bg-card rounded-lg border p-3 hover:shadow-md transition-all ${isDragging ? "shadow-lg ring-2 ring-accent/50" : ""}`}
      onClick={() => navigate(`/jobs/${job.id}?board=Shop`)}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-[10px] font-mono text-muted-foreground">{job.job_number}</span>
        <div className="flex items-center gap-1">
          <PriorityBadge rank={job.stage_priority?.[stage]} />
          <PaymentStatusBadge status={paymentStatus} />
          {job.job_type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.job_type}</Badge>}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="p-0.5 rounded hover:bg-muted text-muted-foreground ml-1"
                onClick={e => { e.preventDefault(); e.stopPropagation(); }}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {!readOnly && (
                <>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-sm gap-2">
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Move to...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-48">
                        {Object.entries(FLOWS).map(([board, stages]) => (
                          <DropdownMenuSub key={board}>
                            <DropdownMenuSubTrigger className="text-sm">{board} Flow</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="w-56 max-h-64 overflow-y-auto">
                                {stages.map(stageOption => (
                                  <DropdownMenuItem
                                    key={stageOption}
                                    className="text-sm"
                                    onClick={e => {
                                      e.preventDefault(); e.stopPropagation(); setMenuOpen(false);
                                      if (board === "Shop" && stageOption === "On Deck for Fabrication" && job.stage === "Drawing Needs Approval" && onFabReview) {
                                        onFabReview(job);
                                        return;
                                      }
                                      moveMutation.mutate({ toBoard: board, toStage: stageOption });
                                    }}
                                  >
                                    {stageOption}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-sm gap-2"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); archiveMutation.mutate(); }}
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-sm gap-2 text-destructive focus:text-destructive"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setDeleteOpen(true); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenuItem>
                </>
              )}
              <PriorityMenuItems job={job} stage={stage} columnJobs={columnJobs} onApply={onPriorityChange} closeMenu={() => setMenuOpen(false)} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Link to={`/jobs/${job.id}?board=Shop`}>
        <h4 className="text-sm font-semibold leading-tight mb-0.5 line-clamp-2 hover:text-accent transition-colors">{job.job_name}</h4>
      </Link>
      <JobCardCustomerInfo customerName={job.customer_name} customer={customer} />

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
          onClick={e => { e.preventDefault(); e.stopPropagation(); onComplete(job); }}
        >
          Move to Billing →
        </Button>
      )}
    </div>

    <DeleteJobModal
      open={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      job={job}
      onDeleted={() => setDeleteOpen(false)}
    />
    </>
  );
}

// ── Shop Board ─────────────────────────────────────────────────────────────────
export default function ShopBoard({ jobs = [], readOnly = false }) {
  const qc = useQueryClient();
  const [completing, setCompleting] = useState(null);
  const [fabReview, setFabReview] = useState(null);

  const jobIds = jobs.map(j => j.id);
  const { data: allInvoices = [] } = useQuery({
    queryKey: ["shopBoardInvoices", jobIds.join(",")],
    queryFn: () => base44.entities.Invoice.list("-issued_date", 500),
    enabled: jobIds.length > 0,
  });
  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
  });
  const customersById = Object.fromEntries(allCustomers.map(c => [c.id, c]));
  const invoicesByJob = allInvoices.reduce((acc, inv) => {
    if (!acc[inv.job_id]) acc[inv.job_id] = [];
    acc[inv.job_id].push(inv);
    return acc;
  }, {});

  const columns = {};
  SHOP_STAGES.forEach(s => { columns[s] = []; });
  jobs.forEach(j => {
    const stage = j.stage || "New Jobs Landed — Needs Approval";
    if (columns[stage]) columns[stage].push(j);
    else columns["New Jobs Landed — Needs Approval"].push(j);
  });
  SHOP_STAGES.forEach(s => { columns[s] = sortColumnJobs(columns[s], s); });

  const moveMutation = useMutation({
    mutationFn: async ({ job, toBoard, toStage, note }) => {
      await base44.entities.Job.update(job.id, buildStageTransition(job, toBoard, toStage, note));
      const gapUpdates = closePriorityGap(columns[job.stage] || [], job.stage, job.id);
      if (gapUpdates.length) {
        await base44.entities.Job.bulkUpdate(gapUpdates.map(u => ({ id: u.jobId, stage_priority: u.stage_priority })));
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); setCompleting(null); setFabReview(null); },
  });

  const priorityMutation = useMutation({
    mutationFn: (updates) => base44.entities.Job.bulkUpdate(updates.map(u => ({ id: u.jobId, stage_priority: u.stage_priority }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  function handleDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    const newStage = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (!job) return;
    if (job.stage === newStage) {
      if (source.index === destination.index) return;
      priorityMutation.mutate(reorderColumnPriority(columns[newStage], source.index, destination.index, newStage));
      return;
    }
    if (readOnly) return; // cross-stage moves stay blocked in read-only mode
    if (newStage === "On Deck for Fabrication" && job.stage === "Drawing Needs Approval") {
      setFabReview(job);
      return;
    }
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
                      <Draggable key={job.id} draggableId={job.id} index={index}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                            <ShopCard
                              job={job}
                              isDragging={snap.isDragging}
                              onComplete={readOnly ? undefined : setCompleting}
                              readOnly={readOnly}
                              stage={stage}
                              columnJobs={columns[stage]}
                              onPriorityChange={(updates) => priorityMutation.mutate(updates)}
                              onFabReview={readOnly ? undefined : setFabReview}
                              invoices={invoicesByJob[job.id] || []}
                              customer={customersById[job.customer_id]}
                            />
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

      <ScopeReviewDialog
        open={!!fabReview}
        onClose={() => setFabReview(null)}
        job={fabReview}
        isPending={moveMutation.isPending}
        onConfirm={() => moveMutation.mutate({ job: fabReview, toBoard: "Shop", toStage: "On Deck for Fabrication", note: "Scope reviewed before fabrication" })}
      />
    </>
  );
}