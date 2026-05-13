import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Plus, FileText, FileDiff, Receipt, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import EstimateEditor from "@/components/estimates/EstimateEditor";
import InvoiceEditor from "@/components/documents/InvoiceEditor";
import ChangeOrderEditor from "@/components/documents/ChangeOrderEditor";

// ── Status badge helpers ──────────────────────────────────────────────────────
const EST_STATUS = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

const INV_STATUS = {
  Unpaid:  "bg-amber-100 text-amber-800",
  Partial: "bg-blue-100 text-blue-800",
  Paid:    "bg-emerald-100 text-emerald-800",
  Overdue: "bg-red-100 text-red-800",
};

const CO_STATUS = {
  Draft:    "bg-muted text-muted-foreground",
  Sent:     "bg-blue-100 text-blue-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

function SectionHeader({ icon: Icon, title, count, onNew, newLabel }) {
  return (
    <div className="flex items-center justify-between py-3 border-b">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onNew}>
        <Plus className="w-3 h-3" /> {newLabel}
      </Button>
    </div>
  );
}

function EmptyState({ label, onNew }) {
  return (
    <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg mt-2">
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default function JobDocumentsTab({ job }) {
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [coOpen, setCoOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCo, setSelectedCo] = useState(null);

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

  const approvedEstimateTotal = estimates.find(e => e.status === "Approved")?.total || job.estimate_total || 0;

  function openEstimate(est = null) { setSelectedEstimate(est); setEstimateOpen(true); }
  function openInvoice(inv = null) { setSelectedInvoice(inv); setInvoiceOpen(true); }
  function openCo(co = null) { setSelectedCo(co); setCoOpen(true); }

  return (
    <div className="space-y-6">
      {/* ── ESTIMATES ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={FileText} title="Estimates" count={estimates.length} onNew={() => openEstimate()} newLabel="New Estimate" />
        {estimates.length === 0 ? (
          <EmptyState label="No estimates yet." />
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
                        : est.created_date
                          ? format(parseISO(est.created_date), "MMM d, yyyy")
                          : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">${(est.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  <Badge className={`text-xs ${EST_STATUS[est.status] || ""}`}>{est.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── INVOICES ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Receipt} title="Invoices" count={invoices.length} onNew={() => openInvoice()} newLabel="New Invoice" />
        {invoices.length === 0 ? (
          <EmptyState label="No invoices yet." />
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
                    <p className="text-sm font-medium">Invoice #{inv.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.invoice_type} · {inv.issued_date ? format(parseISO(inv.issued_date), "MMM d, yyyy") : "—"}
                      {inv.due_date ? ` · Due ${format(parseISO(inv.due_date), "MMM d")}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-semibold">${(inv.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    {inv.balance_due > 0 && (
                      <p className="text-xs text-muted-foreground">Bal: ${inv.balance_due.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
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
          <EmptyState label="No change orders yet." />
        ) : (
          <div className="divide-y border rounded-lg mt-2 overflow-hidden">
            {changeOrders.map(co => (
              <div key={co.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 cursor-pointer" onClick={() => openCo(co)}>
                <div className="flex items-center gap-3">
                  <FileDiff className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">CO #{co.id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{co.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${(co.cost_impact || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {(co.cost_impact || 0) >= 0 ? "+" : ""}${(co.cost_impact || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  {co.status === "Approved" && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">Needs Invoice</Badge>
                  )}
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
            onClose={() => setInvoiceOpen(false)}
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