import React, { useState } from "react";
import { startOfMonth, subMonths, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";

// Revenue goal stored in localStorage for simplicity (no settings entity needed)
const GOAL_KEY = "fabtrack_monthly_revenue_goal";

export default function RevenueGoalWidget({ jobs }) {
  const [goal, setGoal] = React.useState(() => {
    try { return Number(localStorage.getItem(GOAL_KEY)) || null; } catch { return null; }
  });
  const [editing, setEditing] = React.useState(false);
  const [goalInput, setGoalInput] = React.useState(goal ? String(goal) : "");

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const approvedStages = ["Approved", "Deposit Received"];

  const revenueThis = (jobs || [])
    .filter(j => approvedStages.includes(j.stage) && j.stage_entered_at && parseISO(j.stage_entered_at) >= thisMonthStart)
    .reduce((s, j) => s + (j.estimate_total || 0), 0);

  const revenueLast = (jobs || [])
    .filter(j => {
      if (!approvedStages.includes(j.stage) || !j.stage_entered_at) return false;
      const d = parseISO(j.stage_entered_at);
      return d >= lastMonthStart && d < thisMonthStart;
    })
    .reduce((s, j) => s + (j.estimate_total || 0), 0);

  const pct = goal ? Math.min(100, Math.round((revenueThis / goal) * 100)) : 0;

  const handleSaveGoal = () => {
    const val = Number(goalInput.replace(/[^0-9]/g, ""));
    if (val > 0) {
      setGoal(val);
      try { localStorage.setItem(GOAL_KEY, String(val)); } catch {}
    } else {
      setGoal(null);
      try { localStorage.removeItem(GOAL_KEY); } catch {}
    }
    setEditing(false);
  };

  const chartData = [
    { month: "Last Month", revenue: revenueLast },
    { month: "This Month", revenue: revenueThis },
  ];

  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Revenue This Month</h3>
        <button
          onClick={() => { setEditing(!editing); setGoalInput(goal ? String(goal) : ""); }}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          {goal ? "Edit Goal" : "Set Goal"}
        </button>
      </div>

      {editing && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            placeholder="Monthly goal e.g. 150000"
            className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          />
          <button
            onClick={handleSaveGoal}
            className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            Save
          </button>
        </div>
      )}

      {goal ? (
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold text-green-500">${revenueThis.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">of ${goal.toLocaleString()} goal</p>
            </div>
            <p className="text-2xl font-bold">{pct}%</p>
          </div>
          <Progress value={pct} className="h-3" />
          <p className="text-xs text-muted-foreground">
            ${(goal - revenueThis).toLocaleString()} remaining to hit goal
          </p>
        </div>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={v => [`$${v.toLocaleString()}`, "Revenue"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}