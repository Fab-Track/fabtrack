import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = [
  "#1e293b","#334155","#475569","#64748b","#0ea5e9","#0284c7","#0369a1",
  "#f59e0b","#d97706","#b45309","#10b981","#059669","#dc2626","#9333ea",
];

function getDateRange(filter) {
  const now = new Date();
  if (filter === "this_year") {
    return new Date(now.getFullYear(), 0, 1);
  }
  if (filter === "last_year") {
    return new Date(now.getFullYear() - 1, 0, 1);
  }
  return null; // all time
}

export default function InstallLocationWidget() {
  const [dateFilter, setDateFilter] = useState("this_year");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices-all-for-report"],
    queryFn: () => base44.entities.Invoice.list("-paid_date", 500),
  });

  // Only Paid or Partial invoices
  const filtered = invoices.filter(inv => {
    if (inv.status !== "Paid" && inv.status !== "Partial") return false;
    if (dateFilter === "all") return true;
    const year = new Date().getFullYear();
    const cutoff = dateFilter === "this_year"
      ? new Date(year, 0, 1)
      : new Date(year - 1, 0, 1);
    const endCutoff = dateFilter === "last_year" ? new Date(year, 0, 1) : null;
    const paidDate = new Date(inv.paid_date || inv.issued_date || inv.created_date || 0);
    if (paidDate < cutoff) return false;
    if (endCutoff && paidDate >= endCutoff) return false;
    return true;
  });

  // Aggregate by install_location across all line items
  const locationMap = {};
  const jobsPerLocation = {};

  filtered.forEach(inv => {
    const jobId = inv.job_id;
    (inv.line_items || []).forEach(item => {
      const loc = item.install_location || "N/A";
      if (!locationMap[loc]) {
        locationMap[loc] = 0;
        jobsPerLocation[loc] = new Set();
      }
      locationMap[loc] += item.total || 0;
      if (jobId) jobsPerLocation[loc].add(jobId);
    });
  });

  const chartData = Object.entries(locationMap)
    .filter(([loc]) => loc !== "N/A")
    .map(([loc, revenue]) => ({
      location: loc.replace(/^(Interior|Exterior|Commercial) — /, ""),
      fullLabel: loc,
      revenue,
      jobs: jobsPerLocation[loc]?.size || 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Install Location Breakdown</h3>
        </div>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="last_year">Last Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          No paid invoices with install locations yet.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="location"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                angle={-40}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                width={42}
              />
              <Tooltip
                formatter={(value, name) => [
                  `$${value.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
                  "Revenue"
                ]}
                labelFormatter={(label) => {
                  const d = chartData.find(x => x.location === label);
                  return d ? `${d.fullLabel} (${d.jobs} job${d.jobs !== 1 ? "s" : ""})` : label;
                }}
                contentStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Top 3 summary */}
          <div className="mt-2 space-y-1.5">
            {chartData.slice(0, 3).map((d, i) => (
              <div key={d.fullLabel} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-muted-foreground flex-1 truncate">{d.fullLabel}</span>
                <span className="font-semibold">{totalRevenue > 0 ? Math.round(d.revenue / totalRevenue * 100) : 0}%</span>
                <span className="text-muted-foreground">{d.jobs} job{d.jobs !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}