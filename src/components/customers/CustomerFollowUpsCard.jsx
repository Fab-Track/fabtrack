import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, isValid, isPast, isToday } from "date-fns";

/**
 * Shows closed jobs with upcoming follow-up dates for a customer.
 * Placed on the customer profile overview.
 */
export default function CustomerFollowUpsCard({ jobs }) {
  const followUps = jobs
    .filter(j => j.follow_up_date)
    .sort((a, b) => (a.follow_up_date || "").localeCompare(b.follow_up_date || ""));

  if (followUps.length === 0) return null;

  return (
    <Card className="mb-5 border-amber-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-amber-600" />
          Follow-Ups ({followUps.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {followUps.map(job => {
            const date = parseISO(job.follow_up_date);
            const valid = isValid(date);
            const overdue = valid && isPast(date) && !isToday(date);
            const today = valid && isToday(date);
            return (
              <div key={job.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{job.job_number}</span>
                    {job.lead_outcome_category && (
                      <Badge variant="outline" className="text-[10px]">{job.lead_outcome_category}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{job.job_name}</p>
                  {job.close_notes && (
                    <p className="text-xs text-muted-foreground truncate">{job.close_notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {valid && (
                    <Badge className={`text-[10px] ${overdue ? "bg-red-100 text-red-700 border-red-200" : today ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground"}`}>
                      {overdue ? "Overdue" : today ? "Today" : format(date, "MMM d, yyyy")}
                    </Badge>
                  )}
                </div>
                <Link to={`/jobs/${job.id}`} className="text-muted-foreground hover:text-foreground shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}