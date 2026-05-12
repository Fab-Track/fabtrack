import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { format, parseISO } from "date-fns";

const WORK_CENTERS = ["Cut", "Fit", "Weld", "Grind", "Powder Coat", "Install", "Demo", "Design"];

export default function JobShopLogTab({ timeEntries, job }) {
  // Group by work center
  const byCenter = {};
  WORK_CENTERS.forEach(wc => { byCenter[wc] = []; });
  timeEntries.forEach(te => {
    if (byCenter[te.work_center]) byCenter[te.work_center].push(te);
  });

  const totalHours = timeEntries.reduce((s, te) => s + (te.duration_hours || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Logged" value={`${totalHours.toFixed(1)}h`} />
        <SummaryCard label="Estimated" value={`${(job.estimated_labor_hours || 0).toFixed(1)}h`} />
        <SummaryCard label="Remaining" value={`${Math.max(0, (job.estimated_labor_hours || 0) - totalHours).toFixed(1)}h`} />
        <SummaryCard label="Entries" value={timeEntries.length} />
      </div>

      {/* By work center */}
      {WORK_CENTERS.map(wc => {
        const entries = byCenter[wc];
        if (entries.length === 0) return null;
        const wcHours = entries.reduce((s, e) => s + (e.duration_hours || 0), 0);

        return (
          <Card key={wc}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{wc}</CardTitle>
                <Badge variant="outline" className="text-xs">{wcHours.toFixed(1)}h</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{entry.employee_name}</span>
                      {entry.is_active && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700">Active</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">
                        {entry.duration_hours ? `${entry.duration_hours.toFixed(1)}h` : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {entry.clock_in && format(parseISO(entry.clock_in), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {timeEntries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No time entries logged for this job yet.</p>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-card rounded-lg border px-3 py-2.5 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}