import React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Clock, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const WC_COLORS = {
  "Cut": "bg-blue-100 text-blue-700",
  "Fit": "bg-purple-100 text-purple-700",
  "Weld": "bg-orange-100 text-orange-700",
  "Grind": "bg-yellow-100 text-yellow-700",
  "Powder Coat": "bg-pink-100 text-pink-700",
  "Install": "bg-emerald-100 text-emerald-700",
  "Demo": "bg-gray-100 text-gray-700",
  "Design": "bg-cyan-100 text-cyan-700",
};

export default function WorkCenterLive({ timeEntries }) {
  const active = (timeEntries || []).filter(t => t.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Wifi className="w-4 h-4 text-emerald-500" />
          Work Center Activity — Live
        </h3>
        <Badge variant="outline" className="text-xs">{active.length} clocked in</Badge>
      </div>

      {active.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Shop floor quiet — nobody clocked in
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Employee</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Job</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Work Center</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Elapsed</th>
              </tr>
            </thead>
            <tbody>
              {active.map(entry => (
                <tr key={entry.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{entry.employee_name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell font-mono">{entry.job_number}</td>
                  <td className="px-3 py-2">
                    <Badge className={`text-xs ${WC_COLORS[entry.work_center] || "bg-muted text-muted-foreground"}`}>
                      {entry.work_center}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                    {entry.clock_in ? formatDistanceToNow(parseISO(entry.clock_in)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}