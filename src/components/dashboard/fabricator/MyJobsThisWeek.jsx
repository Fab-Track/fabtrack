import React from "react";
import { startOfWeek, parseISO } from "date-fns";

export default function MyJobsThisWeek({ employee, timeEntries, qcInspections, jobs }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekEntries = (timeEntries || []).filter(
    e => e.employee_id === employee?.id && !e.is_active && e.clock_in && parseISO(e.clock_in) >= weekStart
  );

  // Group by job + work center
  const grouped = {};
  weekEntries.forEach(e => {
    const key = `${e.job_id}|${e.work_center}`;
    if (!grouped[key]) {
      grouped[key] = {
        job_id: e.job_id,
        job_number: e.job_number,
        job_name: jobs?.find(j => j.id === e.job_id)?.job_name || "",
        work_center: e.work_center,
        hours: 0,
      };
    }
    grouped[key].hours += e.duration_hours || 0;
  });

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
                    <p className="font-semibold">{row.job_name || row.job_number}</p>
                    <p className="text-xs text-muted-foreground font-mono">{row.job_number}</p>
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