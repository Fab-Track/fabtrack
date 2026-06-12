import React from "react";
import { DollarSign, TrendingUp } from "lucide-react";

export default function CustomerLifetimeValueCard({ invoices, customers }) {
  const customerLookup = {};
  (customers || []).forEach(c => { customerLookup[c.id] = c; });

  const recurringCustomerIds = new Set(
    (customers || []).filter(c => c.customer_status === "recurring").map(c => c.id)
  );

  // Sum invoice totals by customer
  const revenueByCustomer = {};
  (invoices || []).forEach(inv => {
    if (!inv.customer_id || !["Paid", "Partial"].includes(inv.status)) return;
    const cid = inv.customer_id;
    if (!revenueByCustomer[cid]) revenueByCustomer[cid] = { total: 0, isRecurring: false };
    revenueByCustomer[cid].total += inv.total || 0;
    revenueByCustomer[cid].isRecurring = recurringCustomerIds.has(cid);
  });

  const entries = Object.entries(revenueByCustomer);
  const recurringEntries = entries.filter(([_, d]) => d.isRecurring);
  const recurringRevenue = recurringEntries.reduce((s, [_, d]) => s + d.total, 0);
  const totalRevenue = entries.reduce((s, [_, d]) => s + d.total, 0);
  const recurringPct = totalRevenue > 0 ? Math.round((recurringRevenue / totalRevenue) * 100) : 0;

  const avgRecurringCLV = recurringEntries.length > 0
    ? Math.round(recurringRevenue / recurringEntries.length)
    : 0;

  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Customer Lifetime Value</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-xl font-bold">{recurringPct}%</p>
            <p className="text-[10px] text-muted-foreground">Recurring revenue</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-xl font-bold">${(avgRecurringCLV / 1000).toFixed(1)}k</p>
            <p className="text-[10px] text-muted-foreground">Avg recurring CLV</p>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t">
        <p className="text-xs text-muted-foreground">
          {recurringEntries.length} recurring customers — ${(recurringRevenue / 1000).toFixed(1)}k lifetime revenue
        </p>
      </div>
    </div>
  );
}