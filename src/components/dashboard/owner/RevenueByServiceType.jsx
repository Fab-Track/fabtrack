import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SERVICE_COLORS = {
  "Railing":       "#3b82f6",
  "Staircase":     "#8b5cf6",
  "Structural":    "#f97316",
  "Gate":          "#10b981",
  "Planter Box":   "#f59e0b",
  "Wall Wrap":     "#ec4899",
  "Awning":        "#06b6d4",
  "Other / Custom":"#6b7280",
};

export default function RevenueByServiceType({ invoices }) {
  const thisYear = new Date().getFullYear();
  const yearInvoices = (invoices || []).filter(inv => {
    const d = inv.issued_date || inv.created_date;
    return d && new Date(d).getFullYear() === thisYear;
  });

  const byCategory = {};
  yearInvoices.forEach(inv => {
    const cat = inv.service_category || "Other / Custom";
    byCategory[cat] = (byCategory[cat] || 0) + (inv.total || 0);
  });

  const data = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Revenue by Service Type</h3>
        <p className="text-xs text-muted-foreground text-center py-6">No invoiced revenue this year yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Revenue by Service Type</h3>
        <span className="text-xs text-muted-foreground">{new Date().getFullYear()} YTD</span>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={index} fill={SERVICE_COLORS[entry.name] || "#6b7280"} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5">
        {data.map(d => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SERVICE_COLORS[d.name] || "#6b7280" }} />
              <span className="text-muted-foreground">{d.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">${d.value.toLocaleString()}</span>
              <span className="text-muted-foreground w-8 text-right">{total > 0 ? `${Math.round((d.value/total)*100)}%` : "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}