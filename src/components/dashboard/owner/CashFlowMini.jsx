import React from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { subDays, format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function CashFlowMini({ invoices }) {
  const now = new Date();
  const data = Array.from({ length: 30 }, (_, i) => {
    const day = subDays(now, 29 - i);
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const collected = (invoices || [])
      .filter(inv => {
        if (inv.status !== "Paid" || !inv.paid_date) return false;
        try { return isWithinInterval(parseISO(inv.paid_date), { start: dayStart, end: dayEnd }); } catch { return false; }
      })
      .reduce((s, inv) => s + (inv.total || 0), 0);
    return { day: format(day, "M/d"), collected };
  });

  const total = data.reduce((s, d) => s + d.collected, 0);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">Total collected (30 days)</p>
      <p className="text-xl font-bold mb-3">${total.toLocaleString()}</p>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="day" tick={false} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={v => `$${v.toLocaleString()}`}
              labelFormatter={l => l}
              contentStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="collected"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}