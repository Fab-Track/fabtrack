import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";
import { isWithinInterval, parseISO, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import ReportDateFilter from "./ReportDateFilter";
import ReportExportButtons from "./ReportExportButtons";
import KpiCard from "./shared/KpiCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, User } from "lucide-react";

function inRange(dateStr, range) {
  if (!range || !dateStr) return true;
  try { return isWithinInterval(parseISO(dateStr), range); } catch { return false; }
}

const RANK_METRICS = [
  { key: "collected", label: "Revenue Collected" },
  { key: "approved", label: "Approved Volume" },
  { key: "closeRate", label: "Close Rate" },
  { key: "sent", label: "Estimates Sent" },
  { key: "avgDeal", label: "Avg Deal Size" },
];

const LEADERBOARD_COLORS = ["#f59e0b", "#94a3b8", "#b45309"];

export default function SalesRepPerformance({ jobs, estimates, invoices }) {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "user");
  const isAdmin = ["owner", "admin"].includes(effectiveRole.toLowerCase());
  const isEstimator = effectiveRole.toLowerCase() === "estimator";

  const [range, setRange] = useState(null);
  const [rankBy, setRankBy] = useState("collected");
  const [selectedRepId, setSelectedRepId] = useState(null);

  // Build rep list from jobs
  const repMap = useMemo(() => {
    const map = {};
    jobs.forEach(j => {
      const rid = j.assigned_rep_id;
      const rname = j.assigned_rep_name;
      if (!rid && !rname) return;
      const key = rid || rname;
      if (!map[key]) map[key] = { id: rid || key, name: rname || "Unknown Rep" };
    });
    // Also pull from estimates' created_by (as fallback)
    estimates.forEach(e => {
      const rid = e.created_by_id;
      if (rid && !map[rid]) {
        const job = jobs.find(j => j.id === e.job_id);
        const jrid = job?.assigned_rep_id;
        if (!jrid) map[rid] = { id: rid, name: job?.assigned_rep_name || "Rep " + (rid || "").slice(-4) };
      }
    });
    return map;
  }, [jobs, estimates]);

  const reps = Object.values(repMap).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Filter by current user for non-admin estimators
  const visibleRepIds = useMemo(() => {
    if (isAdmin) return reps.map(r => r.id);
    if (isEstimator) {
      // Estimator sees their own numbers + leaderboard
      // Match by user id or email
      return reps.filter(r => r.id === user?.id).map(r => r.id);
    }
    return [];
  }, [isAdmin, isEstimator, reps, user]);

  // Per-rep metrics
  const repData = useMemo(() => {
    return reps.map(rep => {
      const repJobs = jobs.filter(j => j.assigned_rep_id === rep.id || (j.assigned_rep_name && j.assigned_rep_name === rep.name));
      const repJobIds = new Set(repJobs.map(j => j.id));

      // Estimates for this rep's jobs, filtered by date range (using estimate created_date)
      const repEstimates = estimates.filter(e =>
        repJobIds.has(e.job_id) && inRange(e.created_date, range)
      );
      const sentEstimates = repEstimates.filter(e => ["Sent", "Approved", "Rejected"].includes(e.status));
      const approvedEstimates = repEstimates.filter(e => e.status === "Approved");

      const sentCount = sentEstimates.length;
      const sentVolume = sentEstimates.reduce((s, e) => s + (e.total || 0), 0);
      const approvedCount = approvedEstimates.length;
      const approvedVolume = approvedEstimates.reduce((s, e) => s + (e.total || 0), 0);
      const closeRate = sentCount > 0 ? Math.round((approvedCount / sentCount) * 100) : 0;
      const avgDeal = approvedCount > 0 ? Math.round(approvedVolume / approvedCount) : 0;

      // Approval time
      const approvalTimes = approvedEstimates
        .filter(e => e.approved_date && e.created_date)
        .map(e => differenceInDays(parseISO(e.approved_date), parseISO(e.created_date)));
      const avgApprovalDays = approvalTimes.length > 0
        ? parseFloat((approvalTimes.reduce((s, d) => s + d, 0) / approvalTimes.length).toFixed(1))
        : null;

      // Revenue collected = paid or partial invoices on rep's jobs, filtered by paid_date in range
      const repInvoices = invoices.filter(inv => {
        if (!repJobIds.has(inv.job_id)) return false;
        if (!["Paid", "Partial"].includes(inv.status)) return false;
        return inRange(inv.paid_date || inv.issued_date, range);
      });
      const collected = repInvoices.reduce((s, inv) => s + (inv.amount_paid || 0), 0);

      return {
        id: rep.id,
        name: rep.name,
        sentCount,
        sentVolume,
        approvedCount,
        approvedVolume,
        closeRate,
        avgDeal,
        avgApprovalDays,
        collected,
      };
    });
  }, [reps, jobs, estimates, invoices, range]);

  // Leaderboard ranked — maps rankBy to the actual data property for the chart
  const rankValueKey = rankBy === "approved" ? "approvedVolume" : rankBy === "sent" ? "sentVolume" : rankBy;

  const leaderboard = useMemo(() => {
    return [...repData]
      .sort((a, b) => {
        switch (rankBy) {
          case "collected": return b.collected - a.collected;
          case "approved": return b.approvedVolume - a.approvedVolume;
          case "closeRate": return b.closeRate - a.closeRate;
          case "sent": return b.sentVolume - a.sentVolume;
          case "avgDeal": return b.avgDeal - a.avgDeal;
          default: return 0;
        }
      })
      .map(r => ({ ...r, _rankValue: rankBy === "closeRate" ? r.closeRate : r[rankValueKey] || 0 }));
  }, [repData, rankBy, rankValueKey]);

  // Detail table: filtered by permission
  const detailRows = selectedRepId
    ? repData.filter(r => r.id === selectedRepId)
    : isAdmin ? repData : repData.filter(r => visibleRepIds.includes(r.id));

  const csvData = () => detailRows.map(r => ({
    Rep: r.name,
    "Sent Count": r.sentCount,
    "Sent Volume": r.sentVolume,
    "Approved Count": r.approvedCount,
    "Approved Volume": r.approvedVolume,
    "Close Rate": `${r.closeRate}%`,
    "Avg Deal Size": r.avgDeal || 0,
    "Avg Days to Approve": r.avgApprovalDays ?? "—",
    "Revenue Collected": r.collected,
  }));

  if (reps.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Sales Rep Performance</h2>
        <p className="text-sm text-muted-foreground py-8 text-center">
          No sales reps assigned to jobs yet. Assign a rep on jobs to start tracking performance.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Sales Rep Performance</h2>
        <div className="flex items-center gap-3">
          <ReportDateFilter onChange={setRange} />
          <ReportExportButtons getData={csvData} filename="rep-performance" />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Team Leaderboard</h3>
          <Select value={rankBy} onValueChange={setRankBy}>
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANK_METRICS.map(m => (
                <SelectItem key={m.key} value={m.key} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Bar chart */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderboard.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => rankBy === "closeRate" ? `${v}%` : `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v) => {
                  if (rankBy === "closeRate") return `${v}%`;
                  if (["collected", "approved", "sent", "avgDeal"].includes(rankBy)) return `$${v.toLocaleString()}`;
                  return v;
                }} />
                <Bar dataKey="_rankValue" radius={[0, 4, 4, 0]}>
                  {leaderboard.map((_, i) => (
                    <Cell key={i} fill={LEADERBOARD_COLORS[i] || "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rank list */}
          <div className="space-y-1.5">
            {leaderboard.slice(0, 10).map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors ${
                  selectedRepId === r.id ? "bg-accent/20 border-accent" : (isAdmin || r.id === user?.id) ? "cursor-pointer hover:bg-muted/50" : ""
                }`}
                onClick={() => {
                  if (isAdmin || r.id === user?.id) {
                    setSelectedRepId(selectedRepId === r.id ? null : r.id);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center font-bold text-muted-foreground">
                    {i === 0 ? <Trophy className="w-4 h-4 text-amber-500 inline" /> :
                     i === 1 ? <Medal className="w-4 h-4 text-slate-400 inline" /> :
                     i === 2 ? <Medal className="w-4 h-4 text-amber-700 inline" /> :
                     i + 1}
                  </span>
                  <span className="font-medium truncate max-w-[140px]">{r.name}</span>
                </div>
                <span className="font-semibold shrink-0">
                  {rankBy === "closeRate" ? `${r.closeRate}%` :
                   rankBy === "avgDeal" ? `$${r.avgDeal.toLocaleString()}` :
                   rankBy === "approved" ? `$${r.approvedVolume.toLocaleString()}` :
                   rankBy === "sent" ? `$${r.sentVolume.toLocaleString()}` :
                   `$${(r[rankBy] || 0).toLocaleString()}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">
            {selectedRepId
              ? `Detail: ${repData.find(r => r.id === selectedRepId)?.name || "Rep"}`
              : isAdmin ? "All Reps Detail" : "Your Performance"}
          </h3>
          {selectedRepId && (
            <button onClick={() => setSelectedRepId(null)} className="text-xs text-accent hover:underline">
              Show all
            </button>
          )}
        </div>

        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                {["Rep", "Sent", "Sent $", "Approved", "Approved $", "Close Rate", "Avg Deal", "Avg Days", "Collected"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {detailRows.map(r => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.sentCount}</td>
                  <td className="px-3 py-2">${r.sentVolume.toLocaleString()}</td>
                  <td className="px-3 py-2">{r.approvedCount}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">${r.approvedVolume.toLocaleString()}</td>
                  <td className="px-3 py-2 font-semibold">{r.closeRate}%</td>
                  <td className="px-3 py-2">{r.avgDeal > 0 ? `$${r.avgDeal.toLocaleString()}` : "—"}</td>
                  <td className="px-3 py-2">{r.avgApprovalDays !== null ? `${r.avgApprovalDays}d` : "—"}</td>
                  <td className="px-3 py-2 font-semibold">${r.collected.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}