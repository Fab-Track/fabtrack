import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, isPast } from "date-fns";
import { CheckCircle2, AlertCircle, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

const INV_STATUS = {
  Unpaid:  "bg-amber-100 text-amber-800",
  Partial: "bg-blue-100 text-blue-800",
  Paid:    "bg-emerald-100 text-emerald-800",
  Overdue: "bg-red-100 text-red-800",
};

export default function JobFinancialSummary({ job, estimates, invoices, changeOrders, onInvoiceClick }) {
  const qc = useQueryClient();

  const approvedEstimate = estimates.find(e => e.status === "Approved");
  const estimateTotal = approvedEstimate?.total || 0;

  const approvedCOs = (changeOrders || []).filter(co => co.status === "Approved");
  const coTotal = approvedCOs.reduce((s, co) => s + (co.cost_impact || 0), 0);
  const revisedTotal = estimateTotal + coTotal;

  const totalInvoiced = (invoices || []).reduce((s, inv) => s + (inv.total || 0), 0);
  const totalCollected = (invoices || []).reduce((s, inv) => s + (inv.amount_paid || 0), 0);
  const balanceRemaining = revisedTotal - totalCollected;

  const markPaid = useMutation({
    mutationFn: async (inv) => {
      const now = new Date().toISOString().split("T")[0];
      const updated = await base44.entities.Invoice.update(inv.id, {
        status: "Paid",
        amount_paid: inv.total,
        balance_due: 0,
        paid_date: now,
      });

      // Trigger job stage transitions based on invoice type
      if (inv.invoice_type === "Deposit") {
        const currentStage = job.stage || "";
        const depositStages = ["Awaiting Deposit"];
        if (depositStages.includes(currentStage)) {
          await base44.entities.Job.update(job.id, { stage: "Deposit Received" });
        }
      }
      if (inv.invoice_type === "Final") {
        await base44.entities.Job.update(job.id, { stage: "Paid / Closed", pipeline_board: "Billing" });
      }

      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries(["invoices", job.id]);
      qc.invalidateQueries(["job", job.id]);
      toast.success("Invoice marked as paid");
    },
  });

  const sorted = [...(invoices || [])].sort((a, b) => {
    const order = { Deposit: 0, Progress: 1, Final: 2 };
    return (order[a.invoice_type] ?? 99) - (order[b.invoice_type] ?? 99);
  });

  // Check for uninvoiced approved COs after a final invoice exists
  const hasFinalInvoice = (invoices || []).some(i => i.invoice_type === "Final");
  const uninvoicedCOs = approvedCOs.filter(co => {
    // Check if any invoice line item references this CO
    const isInvoiced = (invoices || []).some(inv =>
      (inv.line_items || []).some(li => li._co_id === co.id || (li.description || "").includes(co.id.slice(-6).toUpperCase()))
    );
    return !isInvoiced;
  });

  return (
    <div className="space-y-4 mb-6">
      {/* Financial Summary Card */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Financial Summary</h3>
        </div>
        {!approvedEstimate && (
          <p className="text-xs text-muted-foreground mb-4 italic">
            No approved estimate yet — create an estimate to begin billing
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SummaryItem label="Approved Estimate" value={estimateTotal} />
          <SummaryItem label="Change Orders" value={coTotal} signed />
          <SummaryItem label="Revised Total" value={revisedTotal} bold />
          <SummaryItem label="Total Invoiced" value={totalInvoiced} />
          <SummaryItem label="Total Collected" value={totalCollected} green />
          <SummaryItem label="Balance Remaining" value={balanceRemaining} warn={balanceRemaining > 0} />
        </div>
      </div>

      {/* Uninvoiced CO warning */}
      {hasFinalInvoice && uninvoicedCOs.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Warning:</span>{" "}
            {uninvoicedCOs.length} approved change order{uninvoicedCOs.length > 1 ? "s" : ""} exist{uninvoicedCOs.length === 1 ? "s" : ""} that {uninvoicedCOs.length === 1 ? "has" : "have"} not been included in an invoice. Review before sending the final invoice.
          </p>
        </div>
      )}

      {/* Invoice rows */}
      {sorted.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Invoice #</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Issued</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Due</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(inv => {
                const isOverdue = inv.status === "Unpaid" && inv.due_date && isPast(parseISO(inv.due_date));
                const displayStatus = isOverdue ? "Overdue" : inv.status;
                return (
                  <tr
                    key={inv.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => onInvoiceClick?.(inv)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">#{inv.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-muted text-xs">{inv.invoice_type}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ${(inv.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {inv.issued_date ? format(parseISO(inv.issued_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {inv.due_date ? format(parseISO(inv.due_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`text-xs ${INV_STATUS[displayStatus] || ""}`}>{displayStatus}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      {inv.status !== "Paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={markPaid.isPending}
                          onClick={() => markPaid.mutate(inv)}
                        >
                          Mark Paid
                        </Button>
                      )}
                      {inv.status === "Paid" && (
                        <span className="text-emerald-600 text-xs font-medium flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, signed, bold, green, warn }) {
  const formatted = `${signed && value >= 0 ? "+" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-bold text-base ${
        green ? "text-emerald-600"
        : warn && value > 0 ? "text-amber-600"
        : signed && value > 0 ? "text-emerald-600"
        : signed && value < 0 ? "text-destructive"
        : bold ? "text-foreground"
        : "text-foreground"
      }`}>
        {formatted}
      </p>
    </div>
  );
}