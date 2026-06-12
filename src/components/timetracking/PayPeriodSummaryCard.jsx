import React from "react";
import { differenceInDays, parseISO, format, endOfDay, startOfDay } from "date-fns";
import { formatHours, getNetHours, getCurrentPayPeriod } from "@/lib/timeTrackingHelpers";
import { CalendarDays, Clock, AlertCircle, TrendingUp } from "lucide-react";

function Tile({ label, value, sub, icon: IconComponent, accent }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${accent === "amber" ? "bg-amber-50 border-amber-200" : "bg-card"}`}>
      <div className="flex items-center gap-2">
        {IconComponent && <IconComponent className="w-4 h-4 text-muted-foreground" />}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function PayPeriodSummaryCard({ periodEntries, payPeriod, allEntries, employeeId }) {
  const now = new Date();
  const periodStart = startOfDay(payPeriod.start);
  const periodEnd = endOfDay(payPeriod.end);

  // Regular vs OT hours — per-week cap is 40h
  const weekMap = {};
  periodEntries.forEach(e => {
    const d = e.clock_in ? parseISO(e.clock_in) : null;
    if (!d) return;
    const weekKey = format(d, "yyyy-'W'ww");
    if (!weekMap[weekKey]) weekMap[weekKey] = { regular: 0, overtime: 0 };
    weekMap[weekKey].regular += getNetHours(e);
  });

  let totalRegular = 0;
  let totalOvertime = 0;
  Object.values(weekMap).forEach(w => {
    if (w.regular > 40) {
      totalRegular += 40;
      totalOvertime += (w.regular - 40);
    } else {
      totalRegular += w.regular;
    }
  });

  const totalHours = totalRegular + totalOvertime;
  const shiftCount = periodEntries.length;

  // Countdown
  const daysLeft = differenceInDays(periodEnd, now) + 1;
  const nextPayday = new Date(periodEnd);
  nextPayday.setDate(nextPayday.getDate() + 1);
  const countdownText = daysLeft > 0
    ? `Current period ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} (paid ${format(nextPayday, "MMM d")})`
    : "Period ended — awaiting payroll processing";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Regular Hours" value={formatHours(totalRegular)} icon={Clock} />
        <Tile label="Overtime" value={formatHours(totalOvertime)} icon={TrendingUp} accent={totalOvertime > 0 ? "amber" : undefined} sub={totalOvertime > 0 ? "over 40h/week" : undefined} />
        <Tile label="Pay Period Total" value={formatHours(totalHours)} icon={CalendarDays} />
        <Tile label="Shifts" value={shiftCount} icon={AlertCircle} sub={`${payPeriod.label}`} />
      </div>
      <p className="text-xs text-muted-foreground px-1">{countdownText}</p>
    </div>
  );
}