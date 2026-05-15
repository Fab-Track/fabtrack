import React from "react";
import { Hammer, CalendarCheck, Clock, Star } from "lucide-react";
import { startOfDay, endOfDay, addDays, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-xl border p-4 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

export default function ShopStatsRow({ jobs, timeEntries, qcInspections }) {
  const inFab = jobs.filter(j =>
    j.pipeline_board === "Shop" && (j.stage || "").toLowerCase().includes("fabricat")
  );

  const now = new Date();
  const weekEnd = addDays(startOfDay(now), 7);
  const dueThisWeek = jobs.filter(j => {
    if (!j.expected_install_date) return false;
    const d = parseISO(j.expected_install_date);
    return isWithinInterval(d, { start: startOfDay(now), end: weekEnd });
  });

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const todayHours = (timeEntries || []).filter(t => {
    if (!t.clock_in) return false;
    const d = parseISO(t.clock_in);
    return isWithinInterval(d, { start: todayStart, end: todayEnd });
  }).reduce((s, t) => {
    if (t.is_active) {
      const elapsed = (new Date() - new Date(t.clock_in)) / 3600000;
      return s + elapsed;
    }
    return s + (t.duration_hours || 0);
  }, 0);

  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const monthInspections = (qcInspections || []).filter(q => {
    if (!q.created_date) return false;
    const d = parseISO(q.created_date);
    return isWithinInterval(d, { start: thisMonthStart, end: thisMonthEnd });
  });
  const avgScore = monthInspections.length > 0
    ? (monthInspections.reduce((s, q) => s + (q.quality_score || 0), 0) / monthInspections.length).toFixed(1)
    : "—";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="In Fabrication" value={inFab.length}
        sub="Jobs currently being built" icon={Hammer} color="bg-amber-100 text-amber-700" />
      <StatCard label="Installs This Week" value={dueThisWeek.length}
        sub="Due in next 7 days" icon={CalendarCheck} color="bg-cyan-100 text-cyan-700" />
      <StatCard label="Hours Logged Today" value={todayHours.toFixed(1) + "h"}
        sub="All shop employees" icon={Clock} color="bg-blue-100 text-blue-700" />
      <StatCard label="Avg Craftsman Score" value={avgScore !== "—" ? `${avgScore}/100` : "—"}
        sub={`This month · ${monthInspections.length} inspections`} icon={Star} color="bg-purple-100 text-purple-700" />
    </div>
  );
}