import React from "react";
import { startOfWeek, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { getNetHours } from "@/lib/timeTrackingHelpers";

export default function MyJobsThisWeek({ employee, timeEntries, activeEntry, activeElapsedSeconds = 0, qcInspections, jobs }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekCompleted = (timeEntries || []).filter(
    e => e.employee_id === employee?.id && !e.is_active && e.clock_in && parseISO(e.clock_in) >= weekStart
  );

  // Group by job + work center
  const grouped = {};
  weekCompleted.forEach(e => {
    const key = `${e.job_id}|${e.work_center}`;
    if (!grouped[key]) {
      grouped[key] = {
        job_id: e.job_id,
        job_number: e.job_number,
        job_name: jobs?.find(j => j.id === e.job_id)?.job_name || "",
        work_center: e.work_center,
        hours: 0,
        isActive: false,
      };
    }
    grouped[key].hours += getNetHours(e);
  });

  // Merge active session into grouped rows
  const isMyActive = activeEntry && activeEntry.employee_id === employee?.id &&
    activeEntry.clock_in && parseISO(activeEntry.clock_in) >= weekStart;

  if (isMyActive) {
    const key = `${activeEntry.job_id}|${activeEntry.work_center}`;
    const activeHours = activeElapsedSeconds / 3600;
    if (!grouped[key]) {
      grouped[key] = {
        job_id: activeEntry.job_id,
        job_number: activeEntry.job_number,
        job_name: jobs?.find(j => j.id === activeEntry.job_id)?.job_name || "",
        work_center: activeEntry.work_center,
        hours: 0,
        isActive: true,
      };
    }
    grouped[key].hours += activeHours;
    grouped[key].isActive = true;
  }

  const rows = Object.values(grouped).sort((a, b) => b.hours - a.hours);

  // QC score per job for this employee
  const qcByJob = {};
  (qcInspections || []).forEach(q => {
    if (q.employee_id === employee?.id && q.quality_score != null) {
      if (!qcByJob[q.job_id] || parseISO(q.created_date) > parseISO(qcByJob[q.job_id].created_date)) {
        qcByJob[q.job_id] = q;
      }
    }
  });

  if (rows.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">My Jobs This Week</h3>
        <p className="text-muted-foreground text-center py-6">No time logged this week yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">My Jobs This Week</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left font-medium pb-2">Job</th>
              <th className="text-left font-medium pb-2">Work Center</th>
              <th className="text-right font-medium pb-2">My Hours</th>
              <th className="text-right font-medium pb-2">QC Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const qc = qcByJob[row.job_id];
              const score = qc?.quality_score;
              const scoreColor = score == null ? "text-muted-foreground"
                : score >= 80 ? "text-green-500"
                : score >= 60 ? "text-yellow-500"
                : "text-red-500";
              return (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold">{row.job_name || row.job_number}</p>
                        <p className="text-xs text-muted-foreground font-mono">{row.job_number}</p>
                      </div>
                      {row.isActive && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs shrink-0">Active</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium">{row.work_center}</span>
                  </td>
                  <td className="py-3 text-right font-bold text-lg">{row.hours.toFixed(1)}h</td>
                  <td className={`py-3 text-right font-bold text-lg ${scoreColor}`}>
                    {score != null ? score : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}