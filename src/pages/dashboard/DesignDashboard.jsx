import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { differenceInDays, parseISO, format, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Calendar, CheckCircle2, Clock } from "lucide-react";
import DashKpiCard from "@/components/dashboard/shared/DashKpiCard";
import DashWidget from "@/components/dashboard/shared/DashWidget";
import { Link } from "react-router-dom";

const DRAWING_STAGES = ["Design", "Drawing", "Drawings In Progress", "Design In Progress"];
const DRAWING_COMPLETE_STAGES = ["Drawings Complete", "Design Complete", "Fab Queue", "In Fabrication"];

function getDrawingStatus(job) {
  const stage = job.stage || job.status || "";
  if (DRAWING_COMPLETE_STAGES.some(s => stage.includes(s))) return "Complete";
  if (DRAWING_STAGES.some(s => stage.includes(s))) return "In Progress";
  return "Not Started";
}

const STATUS_STYLES = {
  "Not Started": "bg-red-100 text-red-700",
  "In Progress": "bg-orange-100 text-orange-700",
  "Complete": "bg-emerald-100 text-emerald-700",
};

export default function DesignDashboard() {
  const { user } = useAuth();
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list("-created_date", 100) });
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 300),
    refetchInterval: 5 * 60 * 1000,
  });

  const me = employees.find(e => e.email === user?.email);
  const myJobs = me
    ? jobs.filter(j => j.assigned_estimator === me.id || (j.assigned_crew || []).includes(me.id))
    : jobs;

  const needingDrawings = myJobs.filter(j => {
    const status = getDrawingStatus(j);
    return status !== "Complete" && j.pipeline_board === "Shop";
  });
  const inProgress = needingDrawings.filter(j => getDrawingStatus(j) === "In Progress");
  const completedThisMonth = myJobs.filter(j => {
    const status = getDrawingStatus(j);
    if (status !== "Complete") return false;
    const d = j.updated_date ? parseISO(j.updated_date) : null;
    return d && d >= monthStart && d <= monthEnd;
  });

  const queue = [...needingDrawings].sort((a, b) => {
    const statusOrder = { "In Progress": 0, "Not Started": 1, "Complete": 2 };
    return (statusOrder[getDrawingStatus(a)] || 0) - (statusOrder[getDrawingStatus(b)] || 0);
  });

  const recentComplete = myJobs
    .filter(j => getDrawingStatus(j) === "Complete" && j.updated_date)
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 5);

  // This week's drawing deadlines
  const weekDeadlines = myJobs.filter(j => {
    const d = j.expected_install_date ? parseISO(j.expected_install_date) : null;
    return d && isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <DashKpiCard label="Drawings Needed" value={needingDrawings.length} icon={Pencil} iconColor="bg-red-100 text-red-700" highlight={needingDrawings.length > 0 ? "red" : undefined} />
        <DashKpiCard label="In Progress" value={inProgress.length} icon={Clock} iconColor="bg-orange-100 text-orange-700" />
        <DashKpiCard label="Completed (MTD)" value={completedThisMonth.length} icon={CheckCircle2} iconColor="bg-emerald-100 text-emerald-700" />
      </div>

      {/* Drawing queue */}
      <DashWidget title="My Drawing Queue">
        {queue.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All caught up — no drawings needed right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map(j => {
              const status = getDrawingStatus(j);
              const dueDate = j.expected_install_date;
              const daysUntilDue = dueDate ? differenceInDays(parseISO(dueDate), today) : null;
              const isUrgent = daysUntilDue !== null && daysUntilDue <= 2;
              return (
                <div key={j.id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${isUrgent ? "border-red-300 bg-red-50" : "hover:bg-muted/30"}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-semibold truncate">{j.job_name}</p>
                      <span className="text-[10px] font-mono text-muted-foreground">{j.job_number}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {j.job_type && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{j.job_type}</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_STYLES[status]}`}>{status}</span>
                      {dueDate && (
                        <span className={`text-[10px] ${isUrgent ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
                          Due {format(parseISO(dueDate), "MMM d")}
                          {daysUntilDue !== null && ` · ${daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? "today" : `${daysUntilDue}d`}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={`/jobs/${j.id}`} className="shrink-0">
                    <span className="text-xs text-blue-600 hover:underline">View Job →</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </DashWidget>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent completions */}
        <DashWidget title="Recently Completed Drawings">
          {recentComplete.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No completed drawings yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recentComplete.map(j => (
                <div key={j.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                  <div>
                    <p className="font-medium">{j.job_name}</p>
                    <p className="text-muted-foreground">{j.updated_date ? format(parseISO(j.updated_date), "MMM d, yyyy") : "—"}</p>
                  </div>
                  <Link to={`/jobs/${j.id}`} className="text-blue-600 hover:underline">View →</Link>
                </div>
              ))}
            </div>
          )}
        </DashWidget>

        {/* This week's schedule */}
        <DashWidget title="This Week's Drawing Deadlines" action="Full Schedule" actionTo="/schedule">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {DAYS.map(d => <p key={d} className="text-[10px] font-semibold text-muted-foreground">{d}</p>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => {
              const day = new Date(weekStart);
              day.setDate(day.getDate() + i);
              const dayJobs = weekDeadlines.filter(j => {
                const d = j.expected_install_date ? parseISO(j.expected_install_date) : null;
                return d && d.toDateString() === day.toDateString();
              });
              const isToday2 = day.toDateString() === today.toDateString();
              return (
                <div key={i} className={`min-h-[48px] rounded-lg text-center p-1 ${isToday2 ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
                  <p className="text-[10px] font-medium">{format(day, "d")}</p>
                  {dayJobs.map(j => (
                    <div key={j.id} className="text-[8px] bg-primary text-primary-foreground rounded px-0.5 mt-0.5 truncate" title={j.job_name}>
                      {j.job_name?.slice(0, 8)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {weekDeadlines.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3">No drawing deadlines this week.</p>
          )}
        </DashWidget>
      </div>
    </div>
  );
}