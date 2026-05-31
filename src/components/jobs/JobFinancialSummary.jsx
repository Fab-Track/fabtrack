import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertCircle, DollarSign, CheckCircle2, Sparkles, FileText } from "lucide-react";
import { isPast, parseISO } from "date-fns";
import { toast } from "sonner";

const fmt = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

/**
 * JobFinancialSummary — lifecycle-aware financial summary card.
 *
 * Props:
 *   job, estimates, invoices, changeOrders
 *   onInvoiceClick(inv)
 *   onCreateDepositInvoice()   — open deposit invoice flow
 *   onCreateFinalInvoice()     — open final invoice flow
 *   onNewEstimate()            — navigate to new estimate
 */
export default function JobFinancialSummary({
  job, estimates, invoices, changeOrders,
  onInvoiceClick, onCreateDepositInvoice, onCreateFinalInvoice, onNewEstimate,
}) {
  const qc = useQueryClient();

  // ── Derived state ─────────────────────────────────────────────────────────
  const approvedEstimate = (estimates || []).find(e => e.status === "Approved");
  const pendingEstimate  = !approvedEstimate && (estimates || []).find(e => e.status === "Sent" || e.status === "Draft");
  const hasAnyEstimate   = (estimates || []).length > 0;
  const hasApprovedEst   = !!approvedEstimate;
  const estimateTotal    = approvedEstimate?.total || 0;

  const approvedCOs = (changeOrders || []).filter(co => co.status === "Approved");
  const coTotal     = approvedCOs.reduce((s, co) => s + (co.cost_impact || 0), 0);

  const totalInvoiced  = (invoices || []).reduce((s, inv) => s + (inv.total || 0), 0);
  const revisedTotal   = hasApprovedEst ? estimateTotal + coTotal : totalInvoiced;

  const totalCollected = (invoices || [])
    .filter(inv => inv.status === "Paid" || inv.status === "Partial")
    .reduce((s, inv) => s + (inv.amount_paid || 0), 0);
  const balanceRemaining = totalInvoiced - totalCollected;

  const hasDepositInvoice = (invoices || []).some(i => i.invoice_type === "Deposit");
  const hasFinalInvoice   = (invoices || []).some(i => i.invoice_type === "Final");
  const allInvoicesPaid   = (invoices || []).length > 0 && (invoices || []).every(i => i.status === "Paid");
  const jobFullyPaid      = allInvoicesPaid && balanceRemaining <= 0;

  // Deposit paid?
  const depositPaid = (invoices || []).some(i => i.invoice_type === "Deposit" && i.status === "Paid");

  // Is install complete or beyond?
  const installCompleteStages = ["Install Complete", "Invoiced", "Awaiting Final Payment", "Paid / Closed"];
  const isInstallComplete = installCompleteStages.includes(job?.stage);

  // Uninvoiced approved COs (after final invoice exists)
  const uninvoicedCOs = hasFinalInvoice ? approvedCOs.filter(co =>
    !(invoices || []).some(inv =>
      (inv.line_items || []).some(li => li._co_id === co.id || (li.description || "").includes(co.id.slice(-6).toUpperCase()))
    )
  ) : [];

  // ── Mark Paid mutation ────────────────────────────────────────────────────
  const markPaid = useMutation({
    mutationFn: async (inv) => {
      const now = new Date().toISOString().split("T")[0];
      await base44.entities.Invoice.update(inv.id, {
        status: "Paid",
        amount_paid: inv.total,
        balance_due: 0,
        paid_date: now,
      });
      if (inv.invoice_type === "Deposit" && job.stage === "Awaiting Deposit") {
        await base44.entities.Job.update(job.id, { stage: "Deposit Received" });
      }
      if (inv.invoice_type === "Final") {
        await base44.entities.Job.update(job.id, { stage: "Paid / Closed", pipeline_board: "Billing" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(["invoices", job.id]);
      qc.invalidateQueries(["job", job.id]);
      toast.success("Invoice marked as paid");
    },
  });

  // ── Stage-based subtext ───────────────────────────────────────────────────
  function getSubtext() {
    if (jobFullyPaid) return null; // replaced by banner
    if (!hasAnyEstimate) return "Create an estimate to begin the billing pipeline for this job.";
    if (pendingEstimate) {
      return pendingEstimate.status === "Sent"
        ? "Estimate sent — awaiting customer approval."
        : "Estimate is in draft — send it to the customer for approval.";
    }
    if (hasApprovedEst && !hasDepositInvoice) return "Estimate approved — ready to invoice deposit.";
    if (depositPaid && !hasFinalInvoice) {
      const remaining = revisedTotal - totalCollected;
      if (approvedCOs.length > 0) {
        const coAmt = coTotal > 0 ? ` + ${fmt(coTotal)} in change orders` : "";
        return `Deposit collected — ${fmt(remaining)} remaining to invoice (50% balance${coAmt}).`;
      }
      return "Deposit collected — complete the work, then create your final invoice.";
    }
    return null;
  }
  const subtext = getSubtext();

  // ── Approved Estimate cell ────────────────────────────────────────────────
  function renderApprovedEstimateCell() {
    if (!hasAnyEstimate) {
      return (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Approved Estimate</p>
          <p className="text-sm italic text-muted-foreground">—</p>
        </div>
      );
    }
    if (pendingEstimate) {
      return (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Approved Estimate</p>
          <p className="text-sm text-muted-foreground font-medium">
            Pending <span className="font-normal">({fmt(pendingEstimate.total)})</span>
          </p>
        </div>
      );
    }
    if (!hasApprovedEst && totalInvoiced > 0) {
      // Legacy: invoices but no estimate
      return (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Approved Estimate</p>
          <p className="text-sm italic text-muted-foreground">No estimate linked</p>
        </div>
      );
    }
    return <SummaryItem label="Approved Estimate" value={estimateTotal} />;
  }

  // ── Revised Total / Change Orders — hide when no estimate ─────────────────
  const showEstimateColumns = hasApprovedEst;

  return (
    <div className="space-y-3 mb-6">

      {/* ── Job Closed Banner (Stage 8) ──────────────────────────────── */}
      {jobFullyPaid && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            All invoices paid. This job is complete.
          </p>
        </div>
      )}

      {/* ── Financial Summary Card ────────────────────────────────────── */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Financial Summary</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {renderApprovedEstimateCell()}

          {showEstimateColumns ? (
            <SummaryItem label="Change Orders" value={coTotal} signed />
          ) : (
            <EmptyCell label="Change Orders" />
          )}

          {showEstimateColumns ? (
            <SummaryItem label="Revised Total" value={revisedTotal} bold />
          ) : (
            <EmptyCell label="Revised Total" />
          )}

          <SummaryItem label="Total Invoiced" value={totalInvoiced} />
          <SummaryItem label="Total Collected" value={totalCollected} green />

          {/* Balance Remaining: green=$0, orange>$0, red=overdue */}
          <BalanceCell value={balanceRemaining} invoices={invoices} />
        </div>

        {/* Subtext */}
        {subtext && (
          <p className="text-xs text-muted-foreground mt-4 italic">{subtext}</p>
        )}

        {/* Stage-based CTAs inside the card */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Stage 1 — no estimate */}
          {!hasAnyEstimate && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={onNewEstimate}>
              <FileText className="w-3.5 h-3.5" /> Create Estimate
            </Button>
          )}
          {/* Stage 3 — approved, no deposit yet */}
          {hasApprovedEst && !hasDepositInvoice && (
            <Button size="sm" className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onCreateDepositInvoice}>
              <Sparkles className="w-3.5 h-3.5" /> Create Deposit Invoice
            </Button>
          )}
          {/* Stage 5→7 — deposit paid, install complete, no final invoice yet */}
          {depositPaid && isInstallComplete && !hasFinalInvoice && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={onCreateFinalInvoice}>
              <Sparkles className="w-3.5 h-3.5" /> Create Final Invoice
            </Button>
          )}
        </div>
      </div>

      {/* ── Invoice rows with Mark Paid ───────────────────────────────── */}
      {(invoices || []).length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Invoice</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Amount Paid</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...(invoices || [])].sort((a, b) => {
                const o = { Deposit: 0, Progress: 1, Final: 2 };
                return (o[a.invoice_type] ?? 99) - (o[b.invoice_type] ?? 99);
              }).map(inv => (
                <tr
                  key={inv.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => onInvoiceClick?.(inv)}
                >
                  <td className="px-4 py-3 font-medium text-sm">
                    {inv.invoice_number || `#${inv.id.slice(-6).toUpperCase()}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-muted text-xs">{inv.invoice_type}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(inv.total)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {inv.amount_paid > 0 ? (
                      <span className="text-emerald-600 font-medium">{fmt(inv.amount_paid)}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <InvStatusBadge inv={inv} />
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    {inv.status !== "Paid" ? (
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        disabled={markPaid.isPending}
                        onClick={() => markPaid.mutate(inv)}
                      >
                        Mark Paid
                      </Button>
                    ) : (
                      <span className="text-emerald-600 text-xs font-medium flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Uninvoiced CO warning ─────────────────────────────────────── */}
      {hasFinalInvoice && uninvoicedCOs.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Warning:</span>{" "}
            {uninvoicedCOs.length} approved change order{uninvoicedCOs.length > 1 ? "s" : ""} ha{uninvoicedCOs.length > 1 ? "ve" : "s"} not been included in any invoice.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function SummaryItem({ label, value, signed, bold, green }) {
  const formatted = `${signed && value >= 0 ? "+" : ""}$${Math.abs(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const color = green ? "text-emerald-600"
    : signed && value > 0 ? "text-emerald-600"
    : signed && value < 0 ? "text-destructive"
    : bold ? "text-foreground"
    : "text-foreground";
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-bold text-base ${color}`}>{formatted}</p>
    </div>
  );
}

function EmptyCell({ label }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-base text-muted-foreground/40">—</p>
    </div>
  );
}

function BalanceCell({ value, invoices }) {
  // Red if any invoice is overdue with outstanding balance
  const hasOverdue = (invoices || []).some(
    inv => inv.status !== "Paid" && inv.due_date && isPast(parseISO(inv.due_date))
  );
  const color = value <= 0 ? "text-emerald-600"
    : hasOverdue ? "text-destructive"
    : "text-amber-600";
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">Balance Remaining</p>
      <p className={`font-bold text-base ${color}`}>
        ${Math.abs(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

function InvStatusBadge({ inv }) {
  const isOverdue = inv.status !== "Paid" && inv.due_date && isPast(parseISO(inv.due_date));
  const status = isOverdue ? "Overdue" : inv.status;
  const colors = {
    Unpaid:  "bg-yellow-100 text-yellow-800",
    Partial: "bg-blue-100 text-blue-800",
    Paid:    "bg-emerald-100 text-emerald-800",
    Overdue: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${colors[status] || ""}`}>
      {status}
    </span>
  );
}