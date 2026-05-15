import React from "react";
import { format, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MyScoreBreakdown({ employee, qcInspections, jobs }) {
  const myQC = (qcInspections || [])
    .filter(q => q.employee_id === employee?.id && q.quality_score != null)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const last5 = myQC.slice(0, 5);
  const prev5 = myQC.slice(5, 10);

  const avg = (arr) => arr.length > 0
    ? arr.reduce((s, q) => s + (q.quality_score || 0), 0) / arr.length
    : null;

  const last5Avg = avg(last5);
  const prev5Avg = avg(prev5);

  let trend = null;
  let TrendIcon = Minus;
  let trendColor = "text-muted-foreground";
  if (last5Avg !== null && prev5Avg !== null) {
    const diff = last5Avg - prev5Avg;
    if (diff > 3) { TrendIcon = TrendingUp; trendColor = "text-green-500"; trend = `+${diff.toFixed(0)} vs prev 5`; }
    else if (diff < -3) { TrendIcon = TrendingDown; trendColor = "text-red-500"; trend = `${diff.toFixed(0)} vs prev 5`; }
    else { trend = "Steady vs prev 5"; }
  }

  const overallScore = last5Avg !== null ? Math.round(last5Avg) : null;
  const scoreColor = overallScore == null ? "text-muted-foreground"
    : overallScore >= 80 ? "text-green-500"
    : overallScore >= 60 ? "text-yellow-500"
    : "text-red-500";

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Craftsman Score</h3>
        <div className="flex items-center gap-2">
          <span className={`text-3xl font-bold ${scoreColor}`}>
            {overallScore !== null ? overallScore : "—"}
            <span className="text-base font-normal text-muted-foreground">/100</span>
          </span>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span>{trend}</span>
            </div>
          )}
        </div>
      </div>

      {last5.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No QC inspections yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left font-medium pb-2">Job</th>
                <th className="text-left font-medium pb-2">Work Center</th>
                <th className="text-right font-medium pb-2">Score</th>
                <th className="text-right font-medium pb-2">Date</th>
                <th className="text-right font-medium pb-2">Rework</th>
              </tr>
            </thead>
            <tbody>
              {last5.map((q, i) => {
                const jobName = jobs?.find(j => j.id === q.job_id)?.job_name || q.job_number || "—";
                const sc = q.quality_score;
                const scColor = sc >= 80 ? "text-green-500" : sc >= 60 ? "text-yellow-500" : "text-red-500";
                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium max-w-[140px] truncate">{jobName}</td>
                    <td className="py-2.5 pr-4">
                      <span className="px-2 py-0.5 rounded bg-muted text-xs">{q.work_center}</span>
                    </td>
                    <td className={`py-2.5 text-right font-bold ${scColor}`}>{sc}</td>
                    <td className="py-2.5 text-right text-muted-foreground text-xs">
                      {q.created_date ? format(parseISO(q.created_date), "MMM d") : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      {q.rework_required
                        ? <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Yes</Badge>
                        : <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">No</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}