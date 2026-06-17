import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import { isWithinInterval, parseISO, format } from "date-fns";
import ReportDateFilter from "./ReportDateFilter";
import ReportExportButtons from "./ReportExportButtons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OUTCOME_REASONS } from "@/components/jobs/CloseLeadModal";
import { useOrgFilter } from "@/lib/orgContext";
import { Link } from "react-router-dom";

function inRange(dateStr, range) {
  if (!range || !dateStr) return true;
  try { return isWithinInterval(parseISO(dateStr), range); } catch { return false; }
}

const CATEGORY_COLORS = {
  Won: "bg-emerald-100 text-emerald-800",
  Lost: "bg-red-100 text-red-800",
  Unqualified: "bg-slate-100 text-slate-700",
  "On Hold": "bg-amber-100 text-amber-800",
  Other: "bg-muted text-muted-foreground",
};

export default function ClosedLeadsReport() {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "user");
  const isAdmin = ["owner", "admin"].includes(effectiveRole.toLowerCase());

  const [range, setRange] = useState(null);
  const [filterRepId, setFilterRepId] = useState("all");

  const orgFilter = useOrgFilter();

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", orgFilter],
    queryFn: () => base44.entities.Job.filter(orgFilter, "-created_date", 500),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users", orgFilter],
    queryFn: () => base44.entities.User.filter(orgFilter, "full_name", 200),
  });

  const closedJobs = useMemo(() => {
    return jobs.filter(j => j.is_lead_closed && j.lead_closed_at && inRange(j.lead_closed_at, range));
  }, [jobs, range]);

  // Build rep list from data
  const repMap = useMemo(() => {
    const map = {};
    users.forEach(u => {
      const role = (u.role || "").toLowerCase();
      if (["estimator", "owner", "admin"].includes(role)) {
        map[u.id] = u.full_name;
      }
    });
    // Also pull from jobs
    closedJobs.forEach(j => {
      if (j.assigned_rep_id && !map[j.assigned_rep_id]) {
        map[j.assigned_rep_id] = j.assigned_rep_name || j.assigned_rep_id;
      }
    });
    return map;
  }, [users, closedJobs]);

  // Filter by rep
  const visible = useMemo(() => {
    if (filterRepId === "all") return closedJobs;
    return closedJobs.filter(j => j.assigned_rep_id === filterRepId);
  }, [closedJobs, filterRepId]);

  // Group by outcome category → reason
  const grouped = useMemo(() => {
    const g = {};
    visible.forEach(j => {
      const cat = j.lead_outcome_category || "Other";
      const reason = j.lead_outcome || "Other";
      const key = `${cat}::${reason}`;
      if (!g[key]) g[key] = { category: cat, reason, count: 0, totalValue: 0, jobs: [] };
      g[key].count++;
      g[key].totalValue += j.estimate_total || 0;
      g[key].jobs.push(j);
    });
    return Object.values(g).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return b.totalValue - a.totalValue;
    });
  }, [visible]);

  // Summary by category
  const categorySummary = useMemo(() => {
    const s = {};
    visible.forEach(j => {
      const cat = j.lead_outcome_category || "Other";
      if (!s[cat]) s[cat] = { count: 0, totalValue: 0 };
      s[cat].count++;
      s[cat].totalValue += j.estimate_total || 0;
    });
    return s;
  }, [visible]);

  // Loss analysis totals
  const lossTotal = useMemo(() => {
    const lostJobs = visible.filter(j => j.lead_outcome_category === "Lost");
    const lostValue = lostJobs.reduce((s, j) => s + (j.estimate_total || 0), 0);
    return { count: lostJobs.length, value: lostValue };
  }, [visible]);

  // Exclude Unqualified + Project Cancelled for close rate
  const qualifiedClosed = useMemo(() => {
    return visible.filter(j => {
      if (j.lead_outcome_category === "Unqualified") return false;
      if (j.lead_close_reason === "lost_cancelled") return false;
      return true;
    });
  }, [visible]);
  const wonQualified = qualifiedClosed.filter(j => j.lead_outcome_category === "Won").length;
  const lostQualified = qualifiedClosed.filter(j => j.lead_outcome_category === "Lost").length;
  const adjustedCloseRate = (wonQualified + lostQualified) > 0
    ? Math.round((wonQualified / (wonQualified + lostQualified)) * 100)
    : null;

  const totalWonValue = visible.filter(j => j.lead_outcome_category === "Won").reduce((s, j) => s + (j.estimate_total || 0), 0);

  const csvData = () => grouped.map(g => ({
    Category: g.category,
    Reason: g.reason,
    Count: g.count,
    "Total Value": g.totalValue,
  }));

  if (closedJobs.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Closed Leads / Loss Analysis</h2>
          <ReportDateFilter onChange={setRange} />
        </div>
        <p className="text-sm text-muted-foreground py-8 text-center">
          No closed leads found for the selected period.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Closed Leads / Loss Analysis</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && Object.keys(repMap).length > 1 && (
            <Select value={filterRepId} onValueChange={setFilterRepId}>
              <SelectTrigger className="h-7 text-xs w-40">
                <SelectValue placeholder="All Reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Reps</SelectItem>
                {Object.entries(repMap).map(([id, name]) => (
                  <SelectItem key={id} value={id} className="text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ReportDateFilter onChange={setRange} />
          <ReportExportButtons getData={csvData} filename="closed-leads-analysis" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(categorySummary).map(([cat, s]) => (
          <div key={cat} className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-1">{cat}</div>
            <div className="text-xl font-bold">{s.count}</div>
            {s.totalValue > 0 && (
              <div className="text-[11px] text-muted-foreground">${s.totalValue.toLocaleString()}</div>
            )}
          </div>
        ))}
        {/* Adjusted close rate */}
        {adjustedCloseRate !== null && (
          <div className="rounded-lg border p-3 bg-blue-50/50">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Adj. Close Rate</div>
            <div className="text-xl font-bold text-blue-700">{adjustedCloseRate}%</div>
            <div className="text-[10px] text-muted-foreground">Excl. Unqualified & Cancelled</div>
          </div>
        )}
      </div>

      {/* Won value highlight */}
      {totalWonValue > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-emerald-800">Total Won Revenue</span>
          <span className="text-lg font-bold text-emerald-800">${totalWonValue.toLocaleString()}</span>
        </div>
      )}

      {/* Loss analysis detail */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          Loss Breakdown {lossTotal.count > 0 && `— ${lossTotal.count} opportunities, $${lossTotal.value.toLocaleString()} potential revenue lost`}
        </h3>

        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Reason</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Count</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Value</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">% of Lost</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {grouped.map(g => {
                const pctLost = lossTotal.value > 0 && g.category === "Lost"
                  ? Math.round((g.totalValue / lossTotal.value) * 100)
                  : null;
                return (
                  <tr key={`${g.category}::${g.reason}`} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[g.category] || CATEGORY_COLORS.Other}`}>
                        {g.category}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-medium">{g.reason}</td>
                    <td className="px-3 py-2 text-right">{g.count}</td>
                    <td className="px-3 py-2 text-right font-semibold">${g.totalValue.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {pctLost !== null ? `${pctLost}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent closed leads list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Recently Closed Leads</h3>
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Job</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Customer</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Outcome</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Reason</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Value</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Closed</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Rep</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.slice(0, 50).map(j => (
                <tr key={j.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link to={`/jobs/${j.id}`} className="font-medium hover:underline">{j.job_name}</Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{j.customer_name || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[j.lead_outcome_category] || CATEGORY_COLORS.Other}`}>
                      {j.lead_outcome_category || "—"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{j.lead_outcome || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{j.estimate_total ? `$${j.estimate_total.toLocaleString()}` : "—"}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{j.lead_closed_at ? format(parseISO(j.lead_closed_at), "MMM d, yyyy") : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{j.assigned_rep_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note about adjusted close rate */}
      {adjustedCloseRate !== null && (
        <div className="text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-2 text-center">
          Adjusted Close Rate = Won ÷ (Won + Lost qualified opportunities only). Unqualified leads and "Project Cancelled / Fell Through" are excluded to avoid unfairly penalizing rep close rates.
        </div>
      )}
    </section>
  );
}