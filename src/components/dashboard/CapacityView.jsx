import React from "react";
import { BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const WEEKLY_CAPACITY = 400; // default hours/week, could be user-defined

export default function CapacityView({ jobs }) {
  const activeJobs = jobs.filter(j => 
    !["Invoiced", "Install Complete", "Estimate"].includes(j.status)
  );

  const totalEstimatedHours = activeJobs.reduce((sum, j) => sum + (j.estimated_labor_hours || 0), 0);
  const totalActualHours = activeJobs.reduce((sum, j) => sum + (j.actual_labor_hours || 0), 0);
  const remainingHours = Math.max(0, totalEstimatedHours - totalActualHours);

  // Rough capacity for 30/60/90 days
  const periods = [
    { label: "30 Days", weeks: 4.3 },
    { label: "60 Days", weeks: 8.6 },
    { label: "90 Days", weeks: 12.9 },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        Shop Capacity
      </h3>

      <div className="grid grid-cols-3 gap-3">
        {periods.map(period => {
          const capacity = Math.round(WEEKLY_CAPACITY * period.weeks);
          // Distribute remaining hours proportionally
          const hoursInPeriod = Math.min(remainingHours, capacity);
          const utilization = capacity > 0 ? Math.round((hoursInPeriod / capacity) * 100) : 0;

          return (
            <div key={period.label} className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">{period.label}</div>
              <div className="text-xl font-bold">{utilization}%</div>
              <Progress 
                value={utilization} 
                className={`h-1.5 mt-2 ${utilization > 90 ? '[&>div]:bg-red-500' : utilization > 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {hoursInPeriod}h / {capacity}h
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Remaining hours in pipeline: <span className="font-semibold text-foreground">{remainingHours}h</span></span>
        <span>Capacity: {WEEKLY_CAPACITY}h/week</span>
      </div>
    </div>
  );
}