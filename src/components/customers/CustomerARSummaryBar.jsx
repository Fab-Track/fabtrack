import React from "react";
import { differenceInDays, parseISO } from "date-fns";

export default function CustomerARSummaryBar({ customers, allInvoices }) {
  const totalCustomers = customers.length;

  let totalOutstanding = 0;
  let customersWithOverdue = 0;
  let totalAvgDays = 0;
  let avgDaysCount = 0;

  customers.forEach(c => {
    const invoices = allInvoices.filter(inv => inv.customer_id === c.id || inv.customer_name === c.name);
    const unpaid = invoices.filter(inv => inv.status !== "Paid");
    const outstanding = unpaid.reduce((s, inv) => s + (inv.balance_due || 0), 0);
    totalOutstanding += outstanding;
    if (outstanding > 0) customersWithOverdue++;

    const paid = invoices.filter(inv => inv.status === "Paid" && inv.issued_date && inv.paid_date);
    if (paid.length >= 2) {
      const avg = paid.reduce((s, inv) => {
        return s + Math.max(0, differenceInDays(parseISO(inv.paid_date), parseISO(inv.issued_date)));
      }, 0) / paid.length;
      totalAvgDays += avg;
      avgDaysCount++;
    }
  });

  const globalAvgDays = avgDaysCount > 0 ? Math.round(totalAvgDays / avgDaysCount) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 bg-card border rounded-xl">
      <div>
        <p className="text-xs text-muted-foreground">Total Customers</p>
        <p className="text-lg font-bold">{totalCustomers}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Total Outstanding</p>
        <p className={`text-lg font-bold ${totalOutstanding > 0 ? "text-orange-500" : "text-foreground"}`}>
          ${totalOutstanding.toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Customers w/ Balance</p>
        <p className={`text-lg font-bold ${customersWithOverdue > 0 ? "text-orange-500" : "text-foreground"}`}>
          {customersWithOverdue}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Avg Days to Pay</p>
        <p className="text-lg font-bold">{globalAvgDays !== null ? `${globalAvgDays}d` : "—"}</p>
      </div>
    </div>
  );
}