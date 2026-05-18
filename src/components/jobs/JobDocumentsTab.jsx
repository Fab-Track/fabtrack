import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Plus, FileText, FileDiff, Receipt, CheckCircle2, AlertCircle, Clock, Sparkles } from "lucide-react";
import EstimateEditor from "@/components/estimates/EstimateEditor";
import InvoiceEditor from "@/components/documents/InvoiceEditor";
import ChangeOrderEditor from "@/components/documents/ChangeOrderEditor";
import JobFinancialSummary from "@/components/jobs/JobFinancialSummary";

const EST_STATUS = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
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

export default function JobDocumentsTab({ job }) {
  const qc = useQueryClient();
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [coOpen, setCoOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCo, setSelectedCo] = useState(null);
  const [invoicePrefill, setInvoicePrefill] = useState(null);

  const { data: estimates = [] } = useQuery({
    queryKey: ["estimates", job.id],
    queryFn: () => base44.entities.Estimate.filter({ job_id: job.id }),
  });

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
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
  const hasFinalInvoice = invoices.some(i => i.invoice_type === "Final");

  function openEstimate(est = null) { setSelectedEstimate(est); setEstimateOpen(true); }

  function openInvoice(inv = null, prefill = null) {
    setSelectedInvoice(inv);
    setInvoicePrefill(prefill);
    setInvoiceOpen(true);
  }

  function openCo(co = null) { setSelectedCo(co); setCoOpen(true); }

  // Called from EstimateEditor "Create Deposit Invoice" button
  function handleCreateDepositInvoice({ lines, total, tax }) {
    const prefill = {
      invoice_type: "Deposit",
      line_items: lines.map(l => ({ ...l })),
      tax,
      deposit_modifier: "50%",
      due_days: 7,
      notes: "Thank you for choosing High Country Metal Works. This deposit invoice represents 50% of your approved project total. Work will begin upon receipt of deposit.",
    };
    setEstimateOpen(false);
    openInvoice(null, prefill);
  }

  // "Create Final Invoice" button on the tab
  function handleCreateFinalInvoice() {
    if (!approvedEstimate) return;
    const baseLines = (approvedEstimate.line_items || []).map(l => ({
      ...l,
      group: l.category || "Other",
      description: `[Base 50%] ${l.description}`,
      total: (l.quantity || 0) * (l.unit_cost || 0) * 0.5,
    }));

    const coLines = approvedCOs.map(co => ({
      _co_id: co.id,
      group: "Change Order",
      description: `Change Order #${co.id.slice(-6).toUpperCase()} — ${co.description}`,
      quantity: 1,
      unit: "ls",
      unit_cost: co.cost_impact || 0,
      total: co.cost_impact || 0,
    }));

    const prefill = {
      invoice_type: "Final",
      line_items: [...baseLines, ...coLines],
      tax: approvedEstimate.tax_percent || 0,
      due_days: 30,
      notes: "Thank you for allowing us to complete your project. This final invoice represents the remaining balance including any approved change orders.",
    };
    openInvoice(null, prefill);
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary always at top when invoices exist */}
      {(invoices.length > 0 || approvedEstimate) && (
        <JobFinancialSummary
          job={job}
          estimates={estimates}
          invoices={invoices}
          changeOrders={changeOrders}
          onInvoiceClick={(inv) => openInvoice(inv)}
        />
      )}

      {/* ── ESTIMATES ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={FileText} title="Estimates" count={estimates.length} onNew={() => openEstimate()} newLabel="New Estimate" />
        {estimates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2 text-sm">No estimates yet.</div>
        ) : (
          <div className="divide-y border rounded-lg mt-2 overflow-hidden">
            {estimates.map(est => (
              <div key={est.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 cursor-pointer" onClick={() => openEstimate(est)}>
                <div className="flex items-center gap-3">
                  {est.status === "Approved"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <FileText className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">Estimate #{est.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {est.approved_date
                        ? `Approved ${format(parseISO(est.approved_date), "MMM d, yyyy")}`
                        : est.created_date ? format(parseISO(est.created_date), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">${(est.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  <Badge className={`text-xs ${EST_STATUS[est.status] || ""}`}>{est.status}</Badge>
                  {est.status === "Approved" && !hasDepositInvoice && (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                      <Sparkles className="w-3 h-3 mr-1" /> Ready to Invoice
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── INVOICES ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={Receipt}
          title="Invoices"
          count={invoices.length}
          onNew={() => openInvoice()}
          newLabel="New Invoice"
          extraButton={
            approvedEstimate && !hasFinalInvoice ? (
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-primary text-primary-foreground"
                onClick={handleCreateFinalInvoice}
              >
                <Sparkles className="w-3 h-3" /> Create Final Invoice
              </Button>
            ) : null
          }
        />
        {invoices.length === 0 && (
          <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2 text-sm">
            {approvedEstimate && !hasDepositInvoice
              ? "Estimate approved — open the estimate to create a deposit invoice."
              : "No invoices yet."}
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

      {/* ── Estimate Dialog ───────────────────────────────────────── */}
      <Dialog open={estimateOpen} onOpenChange={setEstimateOpen}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col overflow-hidden">
          <EstimateEditor
            estimate={selectedEstimate}
            job={job}
            onClose={() => setEstimateOpen(false)}
            onCreateDepositInvoice={handleCreateDepositInvoice}
          />
        </DialogContent>
      </Dialog>

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