import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isValid, addMonths, subMonths, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { getJobHealth, getHealthDot } from "@/lib/jobHelpers";
import { Link } from "react-router-dom";

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to align with week
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const jobsWithDate = jobs.filter(j => j.expected_install_date && isValid(parseISO(j.expected_install_date)));

  const getJobsForDay = (day) => {
    return jobsWithDate.filter(j => isSameDay(parseISO(j.expected_install_date), day));
  };

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">Install dates and milestones</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-xs font-medium text-muted-foreground text-center py-2">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="min-h-[80px]" />;
              const dayJobs = getJobsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-1.5 rounded-lg border ${isToday ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-muted/50'}`}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-accent font-bold' : 'text-muted-foreground'}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayJobs.slice(0, 3).map(job => {
                      const health = getJobHealth(job);
                      return (
                        <Link key={job.id} to={`/jobs/${job.id}`}>
                          <div className="flex items-center gap-1 px-1 py-0.5 rounded text-xs hover:bg-muted truncate">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getHealthDot(health)}`} />
                            <span className="truncate">{job.job_name}</span>
                          </div>
                        </Link>
                      );
                    })}
                    {dayJobs.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-1">+{dayJobs.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming installs list */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            This Month's Installs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsWithDate
            .filter(j => isSameMonth(parseISO(j.expected_install_date), currentMonth))
            .sort((a, b) => parseISO(a.expected_install_date) - parseISO(b.expected_install_date))
            .map(job => {
              const health = getJobHealth(job);
              return (
                <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center gap-3 py-2 border-b last:border-0 hover:bg-muted/50 px-2 rounded">
                  <div className={`w-2 h-2 rounded-full ${getHealthDot(health)}`} />
                  <span className="text-xs font-mono text-muted-foreground w-16">{format(parseISO(job.expected_install_date), "MMM d")}</span>
                  <span className="text-sm font-medium flex-1">{job.job_name}</span>
                  <span className="text-xs text-muted-foreground">{job.customer_name}</span>
                  <Badge variant="outline" className="text-xs">{job.status}</Badge>
                </Link>
              );
            })
          }
        </CardContent>
      </Card>
    </div>
  );
}