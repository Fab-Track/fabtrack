import React, { useMemo, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  differenceInSeconds, parseISO, differenceInDays, format, isValid,
  startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth,
} from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import MasterClockCard from "@/components/timetracking/MasterClockCard";
import HoursStatsRow from "@/components/timetracking/HoursStatsRow";

import DashWidget from "@/components/dashboard/shared/DashWidget";
import DesignStatsCards from "@/components/dashboard/design/DesignStatsCards";
import DesignQueue from "@/components/dashboard/design/DesignQueue";
import DesignProductivityStats from "@/components/dashboard/design/DesignProductivityStats";
import {
  getMeasureOrder, getDrawingOrder, saveMeasureOrder, saveDrawingOrder,
} from "@/components/dashboard/design/useDesignPriority";

// The four Shop Flow stages this role owns
const MEASURE_STAGES = ["On Deck for Measure", "Ready for Measure"];
const DRAWING_STAGES = ["Needs Drawing", "Drawing Needs Approval"];
const ALL_DESIGN_STAGES = [...MEASURE_STAGES, ...DRAWING_STAGES];

// Stages that indicate design work has been completed for a job
const COMPLETED_STAGES = [
  "On Deck for Fabrication", "Fabricate",
  "Fabrication Complete — Needs Powder Coat", "At Powder Coat",
  "Ready for Install", "Install in Progress / Not Complete", "Install Complete",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DesignDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState(0);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });
  const { data: allJobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 300),
    refetchInterval: 5 * 60 * 1000,
  });

  const me = employees.find(
    e => e.email === user?.email || e.personal_email === user?.email || e.created_by_id === user?.id
  );

  // ── Clock-in data ──
  const { data: allTimeEntries = [] } = useQuery({ queryKey: ["timeEntries", "all"], queryFn: () => base44.entities.TimeEntry.list("-clock_in", 500) });
  const { data: activeEntries = [] } = useQuery({ queryKey: ["timeEntries", "active"], queryFn: () => base44.entities.TimeEntry.filter({ is_active: true }), refetchInterval: 30000 });

  const myId = me?.id || user?.id;
  const myActiveEntries = myId ? activeEntries.filter(e => e.employee_id === myId) : [];
  const masterEntry = myActiveEntries.find(e => !e.job_id) || null;

  useEffect(() => {
    const unsubscribe = base44.entities.TimeEntry.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (!masterEntry?.clock_in) { setActiveElapsedSeconds(0); return; }
    const tick = () => { const secs = differenceInSeconds(new Date(), parseISO(masterEntry.clock_in)); setActiveElapsedSeconds(Math.max(0, secs)); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [masterEntry?.clock_in]);

  // --- Filter: only Shop board, only design-relevant stages ---
  const shopJobs = allJobs.filter(j => j.pipeline_board === "Shop");

  const measureJobs = shopJobs.filter(j => MEASURE_STAGES.includes(j.stage));
  const drawingJobs = shopJobs.filter(j => DRAWING_STAGES.includes(j.stage));
  const awaitingApprovalJobs = shopJobs.filter(j => j.stage === "Drawing Needs Approval");
  const inProgressJobs = shopJobs.filter(j => ALL_DESIGN_STAGES.includes(j.stage));

  const completedThisMonth = shopJobs.filter(j => {
    if (!COMPLETED_STAGES.includes(j.stage)) return false;
    const d = j.stage_entered_at ? parseISO(j.stage_entered_at) : null;
    return d && isValid(d) && d >= monthStart && d <= monthEnd;
  });

  // --- Recently completed drawings (recently moved to fab-or-beyond) ---
  const recentComplete = shopJobs
    .filter(j => COMPLETED_STAGES.includes(j.stage) && j.stage_entered_at)
    .sort((a, b) => new Date(b.stage_entered_at) - new Date(a.stage_entered_at))
    .slice(0, 6);

  // --- This week's deadline jobs (jobs with install date this week) ---
  const weekDeadlines = allJobs.filter(j => {
    const dateStr = j.promised_install_date || j.expected_install_date;
    if (!dateStr) return false;
    const d = parseISO(dateStr);
    return isValid(d) && isWithinInterval(d, { start: weekStart, end: weekEnd });
  });

  // --- Persistent priority orders from localStorage ---
  const measureOrder = useMemo(() => getMeasureOrder(), []);
  const drawingOrder = useMemo(() => getDrawingOrder(), []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── CLOCK IN ── */}
      <div className="space-y-3">
        <MasterClockCard employee={me || { id: user?.id, name: user?.full_name, work_center_primary: "General" }} masterEntry={masterEntry} />
        {me && <HoursStatsRow employee={me} timeEntries={allTimeEntries} activeEntry={masterEntry} />}
      </div>

      {/* ── Stat Cards ── */}
      <DesignStatsCards
        measuresNeeded={measureJobs.length}
        drawingsNeeded={drawingJobs.filter(j => j.stage === "Needs Drawing").length}
        inProgress={inProgressJobs.length}
        awaitingApproval={awaitingApprovalJobs.length}
        completedThisMonth={completedThisMonth.length}
      />

      {/* ── Priority Queues (side by side) ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DesignQueue
          title="Measures Queue"
          jobs={measureJobs}
          storedOrder={measureOrder}
          onOrderChange={saveMeasureOrder}
          emptyMessage="No jobs awaiting measure right now."
        />
        <DesignQueue
          title="Drawings Queue"
          jobs={drawingJobs}
          storedOrder={drawingOrder}
          onOrderChange={saveDrawingOrder}
          emptyMessage="No drawings needed right now."
        />
      </div>

      {/* ── Productivity Stats ── */}
      <DesignProductivityStats
        jobs={shopJobs}
        currentUserId={me?.id}
        currentUserName={me?.name || user?.full_name}
      />

      {/* ── Bottom Row: Recent Completions + Weekly Deadlines ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recently completed drawings */}
        <DashWidget title="Recently Completed Drawings">
          {recentComplete.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-7 h-7 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-sm text-muted-foreground">No recent completions yet.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentComplete.map(j => {
                const d = j.stage_entered_at ? parseISO(j.stage_entered_at) : null;
                return (
                  <div key={j.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0 gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{j.job_name}</p>
                      <p className="text-muted-foreground">{j.job_number}{d && isValid(d) ? ` · ${format(d, "MMM d, yyyy")}` : ""}</p>
                    </div>
                    <Link to={`/jobs/${j.id}`} className="text-blue-600 hover:underline shrink-0">View →</Link>
                  </div>
                );
              })}
            </div>
          )}
        </DashWidget>

        {/* This week's drawing deadlines (mini calendar) */}
        <DashWidget title="This Week's Drawing Deadlines" action="Full Schedule" actionTo="/schedule">
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAYS.map(d => <p key={d} className="text-[10px] font-semibold text-muted-foreground">{d}</p>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => {
              const day = new Date(weekStart);
              day.setDate(day.getDate() + i);
              const dayJobs = weekDeadlines.filter(j => {
                const dateStr = j.promised_install_date || j.expected_install_date;
                const d = dateStr ? parseISO(dateStr) : null;
                return d && isValid(d) && d.toDateString() === day.toDateString();
              });
              const isToday = day.toDateString() === today.toDateString();
              return (
                <div key={i} className={`min-h-[48px] rounded-lg text-center p-1 ${isToday ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
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
            <p className="text-xs text-muted-foreground text-center mt-3">No install deadlines this week.</p>
          )}
        </DashWidget>
      </div>
    </div>
  );
}