import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, DollarSign } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export default function NeedsAttention({ jobs, invoices, estimates }) {
  const today = new Date();

  // Installs at risk (overdue install dates, not yet complete)
  const installsAtRisk = (jobs || []).filter(j => {
    if (!j.expected_install_date) return false;
    if (["Install Complete","Invoiced"].includes(j.status)) return false;
    return differenceInDays(today, parseISO(j.expected_install_date)) > 0;
  });

  // Estimates aging 14+ days with no response (still in Sent)
  const agingEstimates = (estimates || []).filter(e => {
    if (e.status !== "Sent") return false;
    const d = e.created_date ? parseISO(e.created_date) : null;
    return d && differenceInDays(today, d) >= 14;
  });

  // Overdue invoices
  const overdueInvoices = (invoices || []).filter(inv => {
    if (inv.status === "Paid") return false;
    if (!inv.due_date) return false;
    return differenceInDays(today, parseISO(inv.due_date)) > 0;
  });

  const hasAnything = installsAtRisk.length > 0 || agingEstimates.length > 0 || overdueInvoices.length > 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Needs Your Attention</h3>

      {!hasAnything && (
        <p className="text-xs text-muted-foreground py-4 text-center">All clear — nothing needs attention right now.</p>
      )}

      {installsAtRisk.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium">Installs At Risk</span>
            <Badge className="bg-red-100 text-red-700 text-xs px-1.5">{installsAtRisk.length}</Badge>
          </div>
          {installsAtRisk.slice(0, 3).map(j => (
            <div key={j.id} className="flex items-center justify-between pl-5 text-xs">
              <span className="text-muted-foreground truncate max-w-[160px]">{j.job_name}</span>
              <span className="text-red-600 font-medium shrink-0">{differenceInDays(today, parseISO(j.expected_install_date))}d overdue</span>
            </div>
          ))}
          {installsAtRisk.length > 3 && <p className="pl-5 text-xs text-muted-foreground">+{installsAtRisk.length - 3} more</p>}
        </div>
      )}

      {agingEstimates.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-medium">Aging Estimates (14d+)</span>
            <Badge className="bg-yellow-100 text-yellow-700 text-xs px-1.5">{agingEstimates.length}</Badge>
          </div>
          {agingEstimates.slice(0, 3).map(e => (
            <div key={e.id} className="flex items-center justify-between pl-5 text-xs">
              <span className="text-muted-foreground font-mono">#{e.id.slice(-6).toUpperCase()}</span>
              <span className="text-yellow-600 font-medium">{differenceInDays(today, parseISO(e.created_date))}d old</span>
            </div>
          ))}
          {agingEstimates.length > 3 && <p className="pl-5 text-xs text-muted-foreground">+{agingEstimates.length - 3} more</p>}
        </div>
      )}

      {overdueInvoices.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium">Overdue Invoices</span>
            <Badge className="bg-red-100 text-red-700 text-xs px-1.5">{overdueInvoices.length}</Badge>
          </div>
          {overdueInvoices.slice(0, 3).map(inv => (
            <div key={inv.id} className="flex items-center justify-between pl-5 text-xs">
              <span className="text-muted-foreground">{inv.customer_name || inv.invoice_number}</span>
              <span className="text-red-600 font-medium">${(inv.balance_due || inv.total || 0).toLocaleString()}</span>
            </div>
          ))}
          {overdueInvoices.length > 3 && <p className="pl-5 text-xs text-muted-foreground">+{overdueInvoices.length - 3} more</p>}
        </div>
      )}
    </div>
  );
}