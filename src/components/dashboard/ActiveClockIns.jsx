import React from "react";
import { Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function ActiveClockIns({ timeEntries }) {
  const active = (timeEntries || []).filter(t => t.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Shop Floor — Live
        </h3>
        <Badge variant="outline" className="text-xs">
          {active.length} clocked in
        </Badge>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No one clocked in right now</p>
      ) : (
        <div className="space-y-1.5">
          {active.map(entry => (
            <div key={entry.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{entry.employee_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{entry.job_number}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">{entry.work_center}</Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {entry.clock_in && formatDistanceToNow(parseISO(entry.clock_in), { addSuffix: false })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}