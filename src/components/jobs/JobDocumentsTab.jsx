import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { Plus, FileText, FileDiff, Receipt, CheckCircle2, AlertCircle, Clock, Sparkles, RefreshCw, Archive } from "lucide-react";
import InvoiceEditor from "@/components/documents/InvoiceEditor";
import ChangeOrderEditor from "@/components/documents/ChangeOrderEditor";
import JobFinancialSummary from "@/components/jobs/JobFinancialSummary";
import RailingCalculatorModal from "@/components/estimates/RailingCalculatorModal";
import NewInvoiceFlow from "@/components/invoices/NewInvoiceFlow";
import { useAuth } from "@/lib/AuthContext";

const EST_STATUS = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

const INV_STATUS = {
  Unpaid:  "bg-yellow-100 text-yellow-800",
  Partial: "bg-blue-100 text-blue-800",
  Paid:    "bg-emerald-100 text-emerald-800",
  Overdue: "bg-red-100 text-red-800",
};

const INV_LABEL_STYLES = {
  "Deposit Invoice (50%)":  "bg-blue-100 text-blue-800 border-blue-200",
  "Full Invoice (100%)":    "bg-violet-100 text-violet-800 border-violet-200",
  "Final Invoice":          "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Progress Invoice":       "bg-amber-100 text-amber-800 border-amber-200",
  "Change Order Invoice":   "bg-orange-100 text-orange-800 border-orange-200",
};

const CO_STATUS = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

function SectionHeader({ icon: Icon, title, count, onNew, newLabel, extraButton }) {
  return (
    <div className="flex items-center justify-between py-3 border-b">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      <div className="flex items-center gap-2">
        {extraButton}
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onNew}>
          <Plus className="w-3 h-3" /> {newLabel}
        </Button>
      </div>
    </div>
  );
}

// Detect if job has a Railing product
function jobHasRailing(job) {
  if (job?.job_type === "Railing") return true;
  if (Array.isArray(job?.product_instances)) {
    return job.product_instances.some(p => p.product_type === "Railing");
  }
  return false;
}

export default function JobDocumentsTab({ job }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [coOpen, setCoOpen] = useState(false);
  const [newInvoiceFlowOpen, setNewInvoiceFlowOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCo, setSelectedCo] = useState(null);
  const [invoicePrefill, setInvoicePrefill] = useState(null);
  const [railingPromptOpen, setRailingPromptOpen] = useState(false);
  const [railingCalcOpen, setRailingCalcOpen] = useState(false);

  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates", job.id],
    queryFn: () => base44.entities.Estimate.filter({ job_id: job.id }),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", job.id],
    queryFn: () => base44.entities.Invoice.filter({ job_id: job.id }),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ["changeOrders", job.id],
    queryFn: () => base44.entities.ChangeOrder.filter({ job_id: job.id }),
  });

  const approvedEstimate = estimates.find(e => e.status === "Approved");
  const approvedEstimateTotal = approvedEstimate?.total || job.estimate_total || 0;
  const approvedCOs = changeOrders.filter(co => co.status === "Approved");

  // Already have a deposit invoice?
  const hasDepositInvoice = invoices.some(i => i.invoice_type === "Deposit");
  const hasFinalInvoice   = invoices.some(i => i.invoice_type === "Final");
  const allPaid = invoices.length > 0 && invoices.every(i => i.status === "Paid");
  const totalInvoiced  = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = invoices.filter(i => i.status === "Paid" || i.status === "Partial").reduce((s, i) => s + (i.amount_paid || 0), 0);
  const jobFullyPaid = allPaid && (totalInvoiced - totalCollected) <= 0;

  function openEstimate(est = null) {
    if (est?.id) {
      navigate(`/jobs/${job.id}/estimates/${est.id}`);
    } else {
      navigate(`/jobs/${job.id}/estimates/new`);
    }
  }

  function handleNewEstimateClick() {
    navigate(`/jobs/${job.id}/estimates/new`);
  }

  async function handleRequote(declinedEst) {
    // Archive the declined estimate by marking it superseded, then open new estimate
    await base44.entities.Estimate.update(declinedEst.id, {
      status: "Rejected",
      notes: (declinedEst.notes ? declinedEst.notes + "\n\n" : "") + "[Superseded — Requote created]",
    });
    qc.invalidateQueries({ queryKey: ["estimates", job.id] });
    // Navigate to new estimate with prefilled line items via query param
    const params = new URLSearchParams({ requoteFrom: declinedEst.id });
    navigate(`/jobs/${job.id}/estimates/new?${params.toString()}`);
  }

  async function handleArchiveEstimate(est) {
    await base44.entities.Estimate.update(est.id, { status: "Rejected" });
    qc.invalidateQueries({ queryKey: ["estimates", job.id] });
  }

  function handleRailingCalcGenerate({ lineItems, total, notes, stylePhotoUrl, style, lnft }) {
    setRailingCalcOpen(false);
    setRailingPromptOpen(false);
    navigate(`/jobs/${job.id}/estimates/new`);
  }

  function openInvoice(inv = null, prefill = null) {
    setSelectedInvoice(inv);
    setInvoicePrefill(prefill);
    setInvoiceOpen(true);
  }

  function handleNewInvoiceConfirm({ invoiceType, lineItems, invoice_label }) {
    openInvoice(null, {
      invoice_type: invoiceType,
      invoice_label,
      line_items: lineItems,
      discount_percent: approvedEstimate?.discount_percent || 0,
    });
  }

  function openCo(co = null) { setSelectedCo(co); setCoOpen(true); }

  // Called from EstimateEditor "Create Deposit Invoice" button
  function handleCreateDepositInvoice({ lines, total, tax, discount_percent }) {
    const prefill = {
      invoice_type: "Deposit",
      invoice_label: "Deposit Invoice (50%)",
      line_items: lines.map(l => ({ ...l })),
      tax,
      discount_percent: discount_percent || 0,
      deposit_modifier: "50%",
      due_days: 7,
      notes: "Thank you for choosing High Country Metal Works. This deposit invoice represents 50% of your approved project total. Work will begin upon receipt of deposit.",
    };
    openInvoice(null, prefill);
  }



  return (
    <div className="space-y-6">
      {/* Financial Summary — always visible */}
      <JobFinancialSummary
        job={job}
        estimates={estimates}
        invoices={invoices}
        changeOrders={changeOrders}
        onInvoiceClick={(inv) => openInvoice(inv)}
        onNewEstimate={handleNewEstimateClick}
        onCreateDepositInvoice={() => setNewInvoiceFlowOpen(true)}
        onCreateFinalInvoice={() => setNewInvoiceFlowOpen(true)}
      />

      {/* ── ESTIMATES ─────────────────────────────────────────────── */}
      {(() => {
        const primaryEst = estimates[0]; // One estimate per job
        const hasEst = !!primaryEst;
        const isApproved = primaryEst?.status === "Approved";
        const isDeclined = primaryEst?.status === "Rejected";
        const hasMultiple = estimates.length > 1;

        return (
          <div>
            {/* Section header */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Estimate</span>
                {hasEst && (
                  <Badge className={`text-xs ${EST_STATUS[primaryEst.status] || ""}`}>{primaryEst.status}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!hasEst && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleNewEstimateClick}>
                    <Plus className="w-3 h-3" /> New Estimate
                  </Button>
                )}
                {isDeclined && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => handleRequote(primaryEst)}>
                    <RefreshCw className="w-3 h-3" /> Requote
                  </Button>
                )}
                {isApproved && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground px-2 py-1 rounded border border-dashed cursor-default">
                          Use Change Orders to modify scope
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Estimate is approved. Use Change Orders to modify scope.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Multiple estimates warning banner */}
            {hasMultiple && (
              <div className="mt-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" />
                <span>This job has multiple estimates. Archive unused estimates to clean up the billing record.</span>
              </div>
            )}

            {!hasEst ? (
              <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2 text-sm">No estimate yet.</div>
            ) : (
              <div className="divide-y border rounded-lg mt-2 overflow-hidden">
                {estimates.map((est, idx) => {
                  const isSuperseded = est.notes?.includes("[Superseded — Requote created]");
                  return (
                    <div key={est.id} className={`flex items-center justify-between px-4 py-3 hover:bg-muted/40 cursor-pointer ${isSuperseded ? "opacity-60" : ""}`}
                      onClick={() => openEstimate(est)}>
                      <div className="flex items-center gap-3">
                        {est.status === "Approved"
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          : est.status === "Rejected"
                          ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          : <FileText className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                        <div>
                          <p className="text-sm font-medium">
                            Estimate #{est.id.slice(-6).toUpperCase()}
                            {isSuperseded && <span className="ml-2 text-xs text-muted-foreground italic">Declined — Superseded</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {est.approved_date
                              ? `Approved ${format(parseISO(est.approved_date), "MMM d, yyyy")}`
                              : est.created_date ? format(parseISO(est.created_date), "MMM d, yyyy") : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">${(est.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        {est.service_category && (
                          <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50 hidden md:flex">{est.service_category}</Badge>
                        )}
                        <Badge className={`text-xs ${EST_STATUS[est.status] || ""}`}>{est.status}</Badge>
                        {est.status === "Approved" && !hasDepositInvoice && (
                          <Badge
                            className="bg-emerald-600 text-white border border-emerald-700 text-xs cursor-pointer hover:bg-emerald-700 transition-colors"
                            onClick={e => { e.stopPropagation(); setNewInvoiceFlowOpen(true); }}
                          >
                            <Sparkles className="w-3 h-3 mr-1" /> Ready to Invoice
                          </Badge>
                        )}
                        {/* Archive button on non-approved estimates when there are multiples */}
                        {hasMultiple && est.status !== "Approved" && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={e => { e.stopPropagation(); handleArchiveEstimate(est); }}>
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── INVOICES ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between py-3 border-b">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Invoices</span>
            <span className="text-xs text-muted-foreground">({invoices.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {!jobFullyPaid ? (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setNewInvoiceFlowOpen(true)}>
                <Plus className="w-3 h-3" /> New Invoice
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setNewInvoiceFlowOpen(true)}>
                <Plus className="w-3 h-3" /> Add Invoice…
              </Button>
            )}
          </div>
        </div>
        {invoices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2 text-sm">
            No invoices yet.
          </div>
        ) : (
          <div className="divide-y border rounded-lg mt-2 overflow-hidden">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 cursor-pointer" onClick={() => openInvoice(inv)}>
                <div className="flex items-center gap-3">
                  {inv.status === "Paid"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : inv.status === "Overdue"
                    ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    : <Clock className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">
                      {inv.invoice_number || `Invoice #${inv.id.slice(-6).toUpperCase()}`}
                      <span className="ml-2 text-xs text-muted-foreground font-normal">{inv.invoice_type}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.issued_date ? `Issued ${format(parseISO(inv.issued_date), "MMM d, yyyy")}` : "—"}
                      {inv.due_date ? ` · Due ${format(parseISO(inv.due_date), "MMM d, yyyy")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">${(inv.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  {inv.invoice_label && (
                    <Badge className={`text-xs border hidden md:inline-flex ${INV_LABEL_STYLES[inv.invoice_label] || "bg-muted text-muted-foreground"}`}>
                      {inv.invoice_label}
                    </Badge>
                  )}
                  <Badge className={`text-xs ${INV_STATUS[inv.status] || ""}`}>{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CHANGE ORDERS ─────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={FileDiff} title="Change Orders" count={changeOrders.length} onNew={() => openCo()} newLabel="New CO" />
        {changeOrders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2 text-sm">No change orders yet.</div>
        ) : (
          <div className="divide-y border rounded-lg mt-2 overflow-hidden">
            {changeOrders.map((co, i) => (
              <div key={co.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 cursor-pointer" onClick={() => openCo(co)}>
                <div className="flex items-center gap-3">
                  <FileDiff className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">CO #{i + 1} — {co.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{co.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${(co.cost_impact || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {(co.cost_impact || 0) >= 0 ? "+" : ""}${(co.cost_impact || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <Badge className={`text-xs ${CO_STATUS[co.status] || ""}`}>{co.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Railing prompt dialog ─────────────────────────────────── */}
      <Dialog open={railingPromptOpen} onOpenChange={setRailingPromptOpen}>
        <DialogContent className="max-w-sm">
          <h2 className="font-semibold text-base mb-2">New Estimate</h2>
          <p className="text-sm text-muted-foreground mb-4">This job includes a Railing product. Would you like to use the Railing Calculator?</p>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => { setRailingPromptOpen(false); setRailingCalcOpen(true); }}>
              Yes — Use Calculator
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => { setRailingPromptOpen(false); openEstimate(); }}>
              No — Blank Estimate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Railing Calculator Modal ──────────────────────────────── */}
      <RailingCalculatorModal
        open={railingCalcOpen}
        onClose={() => setRailingCalcOpen(false)}
        job={job}
        onGenerateEstimate={handleRailingCalcGenerate}
      />


      {/* ── New Invoice Flow ──────────────────────────────────────── */}
      <NewInvoiceFlow
        open={newInvoiceFlowOpen}
        onClose={() => setNewInvoiceFlowOpen(false)}
        approvedEstimate={approvedEstimate}
        approvedChangeOrders={approvedCOs}
        existingInvoices={invoices}
        onConfirm={handleNewInvoiceConfirm}
      />

      {/* ── Invoice Dialog ────────────────────────────────────────── */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col overflow-hidden">
          <InvoiceEditor
            invoice={selectedInvoice}
            job={job}
            jobInvoices={invoices}
            estimates={estimates}
            changeOrders={changeOrders}
            prefill={invoicePrefill}
            onClose={() => { setInvoiceOpen(false); setInvoicePrefill(null); }}
            currentUser={user}
          />
        </DialogContent>
      </Dialog>

      {/* ── Change Order Dialog ───────────────────────────────────── */}
      <Dialog open={coOpen} onOpenChange={setCoOpen}>
        <DialogContent className="max-w-3xl h-[80vh] p-0 flex flex-col overflow-hidden">
          <ChangeOrderEditor
            changeOrder={selectedCo}
            job={job}
            originalEstimateTotal={approvedEstimateTotal}
            onClose={() => setCoOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}