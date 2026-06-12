import React from "react";
import { differenceInDays, parseISO } from "date-fns";
import DashWidget from "@/components/dashboard/shared/DashWidget";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, Clock, Pause } from "lucide-react";
import { Link } from "react-router-dom";

const CATEGORY_ICONS = {
  Won: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  Lost: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  Unqualified: { icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-50" },
  "On Hold": { icon: Pause, color: "text-amber-600", bg: "bg-amber-50" },
  Other: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50" },
};

export default function ClosedLeadsDashboardCard({ jobs = [] }) {
  const today = new Date();

  const closedJobs = jobs.filter(j => j.is_lead_closed && j.lead_closed_at);
  // Current month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const thisMonthClosed = closedJobs.filter(j => {
    try {
      const d = parseISO(j.lead_closed_at);
      return d >= monthStart && d <= monthEnd;
    } catch { return false; }
  });

  // Breakdown by category
  const breakdown = {};
  thisMonthClosed.forEach(j => {
    const cat = j.lead_outcome_category || "Other";
    if (!breakdown[cat]) breakdown[cat] = [];
    breakdown[cat].push(j);
  });

  // Follow-ups: upcoming or overdue
  const followUps = jobs.filter(j => {
    if (!j.is_lead_closed || !j.follow_up_date || j.follow_up_notified) return false;
    try {
      const fDate = parseISO(j.follow_up_date);
      return fDate <= addDays(today, 1); // due today/tomorrow or overdue
    } catch { return false; }
  }).sort((a, b) => {
    try { return new Date(a.follow_up_date) - new Date(b.follow_up_date); } catch { return 0; }
  });

  const overdueFollowUps = followUps.filter(j => {
    try { return differenceInDays(today, parseISO(j.follow_up_date)) > 0; } catch { return false; }
  });

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  if (thisMonthClosed.length === 0 && followUps.length === 0) {
    return (
      <DashWidget title="Closed Leads — This Month">
        <p className="text-sm text-muted-foreground text-center py-6">No leads closed this month.</p>
      </DashWidget>
    );
  }

  return (
    <DashWidget title="Closed Leads — This Month" action="View Report" actionTo="/reports">
      {/* Outcome breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {Object.keys(CATEGORY_ICONS).map(cat => {
          const Icon = CATEGORY_ICONS[cat].icon;
          const count = breakdown[cat]?.length || 0;
          const total = breakdown[cat]?.reduce((s, j) => s + (j.estimate_total || 0), 0) || 0;
          return (
            <div key={cat} className={`rounded-lg p-3 ${CATEGORY_ICONS[cat].bg} border`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-4 h-4 ${CATEGORY_ICONS[cat].color}`} />
                <span className="text-xs font-semibold">{cat}</span>
              </div>
              <div className="text-lg font-bold">{count}</div>
              {total > 0 && <div className="text-[10px] text-muted-foreground">${total.toLocaleString()}</div>}
            </div>
          );
        })}
      </div>

      {/* Overdue follow-ups */}
      {overdueFollowUps.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700">Overdue Follow-Ups ({overdueFollowUps.length})</span>
          </div>
          <div className="space-y-1">
            {overdueFollowUps.map(j => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between text-xs hover:underline">
                <span>{j.job_name}</span>
                <span className="text-red-600 font-medium">
                  {differenceInDays(today, parseISO(j.follow_up_date))}d overdue
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming follow-ups (non-overdue) */}
      {followUps.filter(j => !overdueFollowUps.includes(j)).length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Upcoming Follow-Ups</span>
          </div>
          <div className="space-y-1">
            {followUps.filter(j => !overdueFollowUps.includes(j)).map(j => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between text-xs hover:underline">
                <span>{j.job_name}</span>
                <span className="text-muted-foreground">{parseISO(j.follow_up_date).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </DashWidget>
  );
}