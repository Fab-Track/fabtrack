import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth } from "date-fns";
import { Wrench, Clock, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import DashKpiCard from "@/components/dashboard/shared/DashKpiCard";
import DashWidget from "@/components/dashboard/shared/DashWidget";
import TodaysInstalls from "@/components/dashboard/owner/TodaysInstalls";
import { Link } from "react-router-dom";

const PROD_STAGES = ["In Fabrication", "Fab Queue", "Powder Coat", "At Powder Coat", "Ready for Install", "Install Scheduled"];

export default function ShopManagerDashboard() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const today = new Date();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 300),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: timeEntries = [] } = useQuery({
    queryKey: ["timeEntries", "active"],
    queryFn: () => base44.entities.TimeEntry.filter({ is_active: true }),
    refetchInterval: 30000,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

  const shopJobs = jobs.filter(j => j.pipeline_board === "Shop");
  const inFab = jobs.filter(j => j.stage === "In Fabrication" || j.stage === "Fab Queue" || j.status === "In Fabrication").length;
  const readyForInstall = jobs.filter(j => j.stage === "Ready for Install" || j.status === "Powder Coat").length;
  const installScheduled = jobs.filter(j => j.stage === "Install Scheduled" || j.status === "Install Scheduled").length;
  const completedThisMonth = jobs.filter(j => {
    if (!["Install Complete","Invoiced"].includes(j.status)) return false;
    const d = j.updated_date ? parseISO(j.updated_date) : null;
    return d && d >= monthStart && d <= monthEnd;
  }).length;

  // Average days per stage (for color coding)
  const stageGroups = {};
  shopJobs.forEach(j => {
    const s = j.stage || j.status || "Unknown";
    if (!stageGroups[s]) stageGroups[s] = [];
    stageGroups[s].push(j);
  });
  const stageAvgDays = {};
  Object.entries(stageGroups).forEach(([stage, stageJobs]) => {
    const days = stageJobs.map(j => j.stage_entered_at ? differenceInDays(today, parseISO(j.stage_entered_at)) : 0);
    stageAvgDays[stage] = days.reduce((s, d) => s + d, 0) / (days.length || 1);
  });

  // Attention items
  const noCrewJobs = shopJobs.filter(j => !j.assigned_crew || j.assigned_crew.length === 0);
  const pastDueJobs = shopJobs.filter(j => j.expected_install_date && differenceInDays(today, parseISO(j.expected_install_date)) > 0 && !["Install Complete","Invoiced"].includes(j.status));
  const readyNoDate = jobs.filter(j => j.stage === "Ready for Install" && !j.expected_install_date);
  const completeNoLog = jobs.filter(j => j.status === "Install Complete" && !j.job_level_data?.site_photos?.after?.length);

  const attentionItems = [
    ...noCrewJobs.map(j => ({ job: j, msg: "No crew assigned", type: "crew" })),
    ...pastDueJobs.map(j => ({ job: j, msg: `Past est. completion (${differenceInDays(today, parseISO(j.expected_install_date))}d overdue)`, type: "overdue" })),
    ...readyNoDate.map(j => ({ job: j, msg: "Ready for install — no date set", type: "date" })),
    ...completeNoLog.map(j => ({ job: j, msg: "Install complete — no after photos", type: "log" })),
  ];

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashKpiCard label="In Fabrication" value={inFab} icon={Wrench} iconColor="bg-purple-100 text-purple-700" navigateTo="/jobs" />
        <DashKpiCard label="Ready for Install" value={readyForInstall} icon={CheckCircle2} iconColor="bg-emerald-100 text-emerald-700" navigateTo="/jobs" />
        <DashKpiCard label="Install Scheduled" value={installScheduled} icon={Calendar} iconColor="bg-blue-100 text-blue-700" navigateTo="/schedule" />
        <DashKpiCard label="Completed (MTD)" value={completedThisMonth} icon={CheckCircle2} iconColor="bg-gray-100 text-gray-700" />
      </div>

      {/* Production Board Snapshot */}
      <DashWidget title="Production Board Snapshot" action="View Full Job Board" actionTo="/jobs">
        {shopJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active production jobs right now.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {PROD_STAGES.map(stage => {
              const stageJobs = shopJobs.filter(j => j.stage === stage || j.status === stage);
              if (stageJobs.length === 0) return null;
              const avgDays = stageAvgDays[stage] || 0;
              return (
                <div key={stage} className="min-w-[180px] flex-shrink-0">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    {stage} ({stageJobs.length})
                  </div>
                  <div className="space-y-1.5">
                    {stageJobs.map(j => {
                      const daysInStage = j.stage_entered_at ? differenceInDays(today, parseISO(j.stage_entered_at)) : null;
                      const isPastDue = j.expected_install_date && differenceInDays(today, parseISO(j.expected_install_date)) > 0;
                      const isLong = daysInStage !== null && daysInStage > avgDays + 3;
                      return (
                        <Link key={j.id} to={`/jobs/${j.id}`}>
                          <div className={`p-2.5 rounded-lg border text-xs ${isPastDue ? "border-red-300 bg-red-50" : isLong ? "border-yellow-300 bg-yellow-50" : "border bg-card hover:bg-muted/30"}`}>
                            <p className="font-semibold truncate">{j.job_name}</p>
                            <p className="text-muted-foreground text-[10px] font-mono">{j.job_number}</p>
                            {daysInStage !== null && <p className={`text-[10px] mt-0.5 ${isPastDue ? "text-red-600" : isLong ? "text-yellow-700" : "text-muted-foreground"}`}>{daysInStage}d in stage</p>}
                            {(j.assigned_crew_names || []).length > 0 && (
                              <p className="text-[10px] text-muted-foreground truncate">{j.assigned_crew_names.join(", ")}</p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashWidget>

      {/* Shop floor + Today's installs */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DashWidget title="Today's Shop Floor">
          {timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No one is clocked in right now.</p>
          ) : (
            <div className="space-y-2">
              {timeEntries.map(entry => {
                const emp = employees.find(e => e.id === entry.employee_id);
                const clockInTime = entry.clock_in ? format(parseISO(entry.clock_in), "h:mm a") : "—";
                const hoursIn = entry.clock_in ? (differenceInDays(today, parseISO(entry.clock_in)) * 24 + (today - parseISO(entry.clock_in)) / 3600000).toFixed(1) : 0;
                return (
                  <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div>
                      <p className="text-xs font-semibold">{emp?.name || entry.employee_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.work_center} · {entry.job_number || "No job"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-semibold text-emerald-700">{clockInTime}</p>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-auto mt-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashWidget>

        <DashWidget title="Today's Installs" action="View Schedule" actionTo="/schedule">
          <TodaysInstalls jobs={jobs} />
        </DashWidget>
      </div>

      {/* Jobs needing attention */}
      <DashWidget title="Jobs Needing Attention">
        {attentionItems.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p className="text-2xl mb-1">✅</p>All production jobs are on track.
          </div>
        ) : (
          <div className="space-y-1.5">
            {attentionItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-amber-50 border-amber-200">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{item.job.job_name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.job.job_number} · {item.msg}</p>
                </div>
                <Link to={`/jobs/${item.job.id}`} className="text-xs text-blue-600 hover:underline shrink-0 ml-3">View Job →</Link>
              </div>
            ))}
          </div>
        )}
      </DashWidget>
    </div>
  );
}