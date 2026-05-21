import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { differenceInDays, parseISO } from "date-fns";

function getAgingBucket(invoice) {
  if (!invoice.due_date) return "current";
  const days = differenceInDays(new Date(), parseISO(invoice.due_date));
  if (days <= 0) return "current";
  if (days <= 10) return "1-10";
  if (days <= 20) return "11-20";
  if (days <= 30) return "21-30";
  return "30+";
}

const BUCKETS = [
  { key: "current", label: "Current", color: "bg-gray-300", textColor: "text-gray-600" },
  { key: "1-10",    label: "1–10d",   color: "bg-yellow-300", textColor: "text-yellow-700" },
  { key: "11-20",   label: "11–20d",  color: "bg-orange-400", textColor: "text-orange-700" },
  { key: "21-30",   label: "21–30d",  color: "bg-orange-600", textColor: "text-orange-800" },
  { key: "30+",     label: "30d+",    color: "bg-red-500",    textColor: "text-red-700" },
];

export default function OutstandingAgingCard({ unpaidInvoices, lifetimeRevenue }) {
  const totals = { "current": 0, "1-10": 0, "11-20": 0, "21-30": 0, "30+": 0 };
  unpaidInvoices.forEach(inv => {
    const b = getAgingBucket(inv);
    totals[b] += (inv.balance_due || 0);
  });

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
  const ltvrPct = lifetimeRevenue > 0 ? (grandTotal / lifetimeRevenue) * 100 : 0;
  const ltvrColor = ltvrPct > 25 ? "text-orange-600" : ltvrPct > 10 ? "text-yellow-600" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
        <p className={`text-xl font-bold ${grandTotal > 0 ? "text-orange-500" : "text-foreground"}`}>
          ${grandTotal.toLocaleString()}
        </p>

        {grandTotal > 0 && (
          <>
            {/* Aging bar */}
            <div className="flex h-2 rounded-full overflow-hidden mt-3 mb-2 gap-px">
              {BUCKETS.map(b => {
                const pct = grandTotal > 0 ? (totals[b.key] / grandTotal) * 100 : 0;
                if (pct === 0) return null;
                return <div key={b.key} className={`${b.color} transition-all`} style={{ width: `${pct}%` }} />;
              })}
            </div>
            {/* Bucket labels */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {BUCKETS.map(b => totals[b.key] > 0 && (
                <div key={b.key} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-sm ${b.color}`} />
                  <span className={`text-[10px] ${b.textColor}`}>{b.label}: <span className="font-semibold">${totals[b.key].toLocaleString()}</span></span>
                </div>
              ))}
            </div>
            {/* LTV context */}
            {lifetimeRevenue > 0 && (
              <p className={`text-xs mt-3 ${ltvrColor}`}>
                Outstanding is {ltvrPct.toFixed(0)}% of lifetime invoiced revenue
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}