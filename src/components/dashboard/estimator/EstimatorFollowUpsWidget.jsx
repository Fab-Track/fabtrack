import React from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function EstimatorFollowUpsWidget({ jobs = [] }) {
  const today = new Date();

  const followUps = jobs.filter(j => {
    if (!j.is_lead_closed || !j.follow_up_date || j.follow_up_notified) return false;
    try {
      const fDate = parseISO(j.follow_up_date);
      return true; // show all pending follow-ups
    } catch { return false; }
  }).sort((a, b) => {
    try { return new Date(a.follow_up_date) - new Date(b.follow_up_date); } catch { return 0; }
  });

  if (followUps.length === 0) return null;

  const overdue = followUps.filter(j => {
    try { return differenceInDays(today, parseISO(j.follow_up_date)) > 0; } catch { return false; }
  });
  const upcoming = followUps.filter(j => !overdue.includes(j));

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500" />
        Follow-Up Reminders
      </h3>

      {overdue.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-semibold text-red-700">Overdue ({overdue.length})</span>
          </div>
          {overdue.map(j => (
            <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-red-50">
              <span className="truncate max-w-[180px]">{j.job_name}</span>
              <span className="text-red-600 font-medium shrink-0 ml-2">
                {differenceInDays(today, parseISO(j.follow_up_date))}d overdue
              </span>
            </Link>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-semibold text-amber-700">Upcoming ({upcoming.length})</span>
          {upcoming.map(j => (
            <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-amber-50">
              <span className="truncate max-w-[180px]">{j.job_name}</span>
              <span className="text-muted-foreground shrink-0 ml-2">{parseISO(j.follow_up_date).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}