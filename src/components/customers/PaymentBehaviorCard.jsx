import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, parseISO } from "date-fns";

export default function PaymentBehaviorCard({ paidInvoices }) {
  const withData = paidInvoices.filter(inv => inv.issued_date && inv.paid_date);

  const avgDays = withData.length > 0
    ? withData.reduce((s, inv) => {
        const days = differenceInDays(parseISO(inv.paid_date), parseISO(inv.issued_date));
        return s + Math.max(0, days);
      }, 0) / withData.length
    : null;

  const onTimeCount = withData.filter(inv => {
    if (!inv.due_date) return true;
    return differenceInDays(parseISO(inv.paid_date), parseISO(inv.due_date)) <= 0;
  }).length;
  const onTimePct = withData.length > 0 ? Math.round((onTimeCount / withData.length) * 100) : null;

  let label = null, badgeClass = "";
  if (avgDays === null || withData.length < 2) {
    label = "Not enough data";
    badgeClass = "bg-gray-100 text-gray-500 border-gray-200";
  } else if (avgDays <= 14) {
    label = "Fast Payer";
    badgeClass = "bg-green-100 text-green-700 border-green-200";
  } else if (avgDays <= 30) {
    label = "Average Payer";
    badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
  } else {
    label = "Slow Payer";
    badgeClass = "bg-red-100 text-red-700 border-red-200";
  }

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">Payment Behavior</p>
        <div className="flex items-center gap-2 mb-2">
          {avgDays !== null && withData.length >= 2 ? (
            <p className="text-xl font-bold">{Math.round(avgDays)}d avg</p>
          ) : (
            <p className="text-xl font-bold text-muted-foreground">—</p>
          )}
          <Badge className={`text-[10px] border ${badgeClass}`}>{label}</Badge>
        </div>
        {onTimePct !== null && (
          <p className="text-xs text-muted-foreground">{onTimePct}% paid on time</p>
        )}
        {withData.length < 2 && (
          <p className="text-xs text-muted-foreground">Need 2+ paid invoices to calculate</p>
        )}
      </CardContent>
    </Card>
  );
}