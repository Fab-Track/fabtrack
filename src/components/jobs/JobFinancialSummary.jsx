import { AlertCircle, DollarSign } from "lucide-react";

export default function JobFinancialSummary({ job, estimates, invoices, changeOrders, onInvoiceClick }) {
  const approvedEstimate = estimates.find(e => e.status === "Approved");
  const estimateTotal = approvedEstimate?.total || 0;
  const hasApprovedEstimate = !!approvedEstimate;

  const approvedCOs = (changeOrders || []).filter(co => co.status === "Approved");
  const coTotal = approvedCOs.reduce((s, co) => s + (co.cost_impact || 0), 0);

  const totalInvoiced = (invoices || []).reduce((s, inv) => s + (inv.total || 0), 0);
  // Revised total: use estimate + COs if available, otherwise fall back to total invoiced
  const revisedTotal = hasApprovedEstimate ? estimateTotal + coTotal : totalInvoiced;

  const totalCollected = (invoices || [])
    .filter(inv => inv.status === "Paid" || inv.status === "Partial")
    .reduce((s, inv) => s + (inv.amount_paid || 0), 0);
  const balanceRemaining = totalInvoiced - totalCollected;

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {hasApprovedEstimate ? (
            <SummaryItem label="Approved Estimate" value={estimateTotal} />
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Approved Estimate</p>
              <p className="text-sm italic text-muted-foreground">No estimate linked</p>
            </div>
          )}
          <SummaryItem label="Change Orders" value={coTotal} signed />
          <SummaryItem label="Revised Total" value={revisedTotal} bold />
          <SummaryItem label="Total Invoiced" value={totalInvoiced} />
          <SummaryItem label="Total Collected" value={totalCollected} green />
          <SummaryItem label="Balance Remaining" value={balanceRemaining} warn={balanceRemaining > 0} green={balanceRemaining <= 0} />
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