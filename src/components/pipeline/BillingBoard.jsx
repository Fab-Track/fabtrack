import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { BILLING_STAGES, BILLING_COLORS, BILLING_CARD_BG, daysInStage, buildStageTransition } from "@/lib/pipelineHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { differenceInDays, parseISO, isValid } from "date-fns";
import { DollarSign, Send, CheckCircle2, AlertCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DeleteJobModal from "@/components/jobs/DeleteJobModal";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";

// ── Summary bar ────────────────────────────────────────────────────────────────
function BillingSummary({ jobs, invoiceMap }) {
  const buckets = [
    { label: "Invoice Sent", stages: ["2nd Half Invoice Sent"] },
    { label: "10–14d Overdue", stages: ["10 Days Overdue"] },
    { label: "15–19d Overdue", stages: ["15 Days Overdue"] },
    { label: "20–29d Overdue", stages: ["20 Days Overdue"] },
    { label: "30+ Overdue", stages: ["30 Days Overdue", "30+ Days Overdue"] },
  ];

  const totalOutstanding = jobs
    .filter(j => j.stage !== "Paid / Closed" && j.stage !== "Needs 2nd Half Invoice Created")
    .reduce((s, j) => {
      const inv = invoiceMap[j.second_half_invoice_id];
      return s + (inv?.balance_due || 0);
    }, 0);

  return (
    <div className="mb-4 shrink-0">
      <div className="flex gap-3 flex-wrap">
        <div className="bg-card border rounded-lg px-4 py-3 min-w-[160px]">
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
          <p className="text-xl font-bold text-destructive">${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 0 })}</p>
        </div>
        {buckets.map(b => {
          const count = jobs.filter(j => b.stages.includes(j.stage)).length;
          const amt = jobs.filter(j => b.stages.includes(j.stage)).reduce((s, j) => {
            const inv = invoiceMap[j.second_half_invoice_id];
            return s + (inv?.balance_due || 0);
          }, 0);
          return (
            <div key={b.label} className="bg-card border rounded-lg px-4 py-3">
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p className="text-base font-bold">{count} jobs</p>
              {amt > 0 && <p className="text-xs text-muted-foreground">${amt.toLocaleString()}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Billing Card ───────────────────────────────────────────────────────────────
function BillingCard({ job, isDragging, invoice, onMarkPaid, onSendReminder, onDeleteJob, canDelete }) {
  const navigate = useNavigate();
  const days = job.invoice_sent_date && isValid(parseISO(job.invoice_sent_date))
    ? differenceInDays(new Date(), parseISO(job.invoice_sent_date))
    : null;

  const bg = BILLING_CARD_BG[job.stage] || "bg-card";
  const isOverdue = days !== null && days > 0 && job.stage !== "Paid / Closed";

  return (
    <div
      className={`${bg} rounded-lg border p-3 hover:shadow-md transition-all ${isDragging ? "shadow-lg ring-2 ring-accent/50" : ""}`}
      onClick={() => navigate(`/jobs/${job.id}?from=billing`)}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-[10px] font-mono text-muted-foreground">{job.job_number}</span>
        <div className="flex items-center gap-1">
          {isOverdue && (
            <span className={`text-xs font-bold ${days >= 30 ? "text-red-700" : days >= 20 ? "text-orange-600" : "text-yellow-700"}`}>
              {days}d overdue
            </span>
          )}
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-0.5 rounded hover:bg-black/5 text-muted-foreground" onClick={e => { e.preventDefault(); e.stopPropagation(); }} onMouseDown={e => e.stopPropagation()}>
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-sm">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onDeleteJob(job); }}
                >
                  Delete Job
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <Link to={`/jobs/${job.id}?from=billing`}>
        <h4 className="text-sm font-semibold leading-tight mb-0.5 line-clamp-1 hover:text-accent transition-colors">{job.job_name}</h4>
      </Link>
      <p className="text-xs text-muted-foreground mb-2">{job.customer_name}</p>

      {invoice && (
        <div className="flex items-center gap-1 text-sm font-bold mb-2">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          ${(invoice.balance_due || invoice.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
      )}

      <div className="flex gap-1.5 mt-2">
        {job.stage !== "Paid / Closed" && (
          <>
            <Button
              size="sm"
              className="flex-1 h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 gap-1"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onMarkPaid(job); }}
            >
              <CheckCircle2 className="w-3 h-3" /> Mark Paid
            </Button>
            {invoice?.customer_id && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px] gap-1"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onSendReminder(job, invoice); }}
              >
                <Send className="w-3 h-3" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Billing Board ──────────────────────────────────────────────────────────────
export default function BillingBoard({ jobs = [], readOnly = false }) {
  const qc = useQueryClient();
  const [deletingJob, setDeletingJob] = useState(null);
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "admin");
  const isOwner = effectiveRole.toLowerCase() === "owner";
  const isAdmin = effectiveRole.toLowerCase() === "admin";
  const canDelete = isOwner || isAdmin;

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices-global"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const invoiceMap = Object.fromEntries(invoices.map(inv => [inv.id, inv]));

  const columns = {};
  BILLING_STAGES.forEach(s => { columns[s] = []; });
  jobs.forEach(j => {
    const stage = j.stage || "Needs 2nd Half Invoice Created";
    if (columns[stage]) columns[stage].push(j);
    else columns["Needs 2nd Half Invoice Created"].push(j);
  });

  const moveMutation = useMutation({
    mutationFn: ({ job, toStage, extra = {} }) =>
      base44.entities.Job.update(job.id, { ...buildStageTransition(job, "Billing", toStage), ...extra }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const emailMutation = useMutation({
    mutationFn: ({ to, subject, body }) => base44.integrations.Core.SendEmail({ to, subject, body }),
  });

  function handleDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (!job || job.stage === newStage) return;
    moveMutation.mutate({ job, toStage: newStage });
  }

  function handleMarkPaid(job) {
    moveMutation.mutate({ job, toStage: "Paid / Closed" });
  }

  function handleSendReminder(job, invoice) {
    const to = invoice.customer_id; // email stored on invoice customer
    // Find customer email from invoice
    const email = job.lead_customer_email || "";
    if (!email) { alert("No customer email on file."); return; }
    emailMutation.mutate({
      to: email,
      subject: `Payment Reminder — Invoice for ${job.job_name}`,
      body: `Hi ${job.customer_name},\n\nThis is a friendly reminder that your invoice for "${job.job_name}" has a balance due of $${(invoice.balance_due || 0).toLocaleString()}.\n\nPlease let us know if you have any questions.\n\nThank you,\nHigh Country Metal Works`,
    });
  }

  const columnContent = (
    <div className="flex gap-3 overflow-x-auto flex-1 pb-4">
      {BILLING_STAGES.map(stage => (
        <Droppable key={stage} droppableId={stage} isDropDisabled={readOnly}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`shrink-0 w-60 flex flex-col rounded-xl border border-t-4 ${BILLING_COLORS[stage]} ${snapshot.isDraggingOver ? "bg-accent/20" : "bg-muted/30"}`}
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
                      <div ref={prov.innerRef} {...prov.draggableProps} {...(readOnly ? {} : prov.dragHandleProps)}>
                        <BillingCard
                          job={job}
                          isDragging={snap.isDragging}
                          invoice={invoiceMap[job.second_half_invoice_id]}
                          onMarkPaid={handleMarkPaid}
                          onSendReminder={handleSendReminder}
                          onDeleteJob={setDeletingJob}
                          canDelete={canDelete}
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
  );

  return (
    <>
      <BillingSummary jobs={jobs} invoiceMap={invoiceMap} />
      <DragDropContext onDragEnd={readOnly ? () => {} : handleDragEnd}>
        {columnContent}
      </DragDropContext>

      <DeleteJobModal
        open={!!deletingJob}
        onClose={() => setDeletingJob(null)}
        job={deletingJob}
        onDeleted={() => setDeletingJob(null)}
      />
    </>
  );
}