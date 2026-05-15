import React from "react";
import { useNavigate } from "react-router-dom";

const BUCKETS = [
  { label: "10 Days",   stage: "10 Days Overdue",  bg: "bg-yellow-100",  bar: "bg-yellow-400",  text: "text-yellow-800" },
  { label: "15 Days",   stage: "15 Days Overdue",  bg: "bg-yellow-200",  bar: "bg-yellow-500",  text: "text-yellow-900" },
  { label: "20 Days",   stage: "20 Days Overdue",  bg: "bg-orange-100",  bar: "bg-orange-500",  text: "text-orange-800" },
  { label: "30 Days",   stage: "30 Days Overdue",  bg: "bg-red-100",     bar: "bg-red-500",     text: "text-red-800"   },
  { label: "30+ Days",  stage: "30+ Days Overdue", bg: "bg-red-200",     bar: "bg-red-800",     text: "text-red-900"   },
];

export default function OverdueBillingWidget({ jobs }) {
  const navigate = useNavigate();

  const buckets = BUCKETS.map(b => {
    const matched = jobs.filter(j => j.pipeline_board === "Billing" && j.stage === b.stage);
    const total = matched.reduce((s, j) => s + (j.estimate_total || 0), 0);
    return { ...b, count: matched.length, total };
  }).filter(b => b.count > 0);

  const maxVal = Math.max(...buckets.map(b => b.total), 1);

  if (buckets.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Overdue Billing</h3>
        <p className="text-sm text-muted-foreground text-center py-6">No overdue invoices</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Overdue Billing</h3>
        <span className="text-xs text-muted-foreground">Click to open billing board</span>
      </div>
      <div className="space-y-2">
        {buckets.map(b => (
          <button
            key={b.stage}
            onClick={() => navigate("/jobs?board=Billing&stage=" + encodeURIComponent(b.stage))}
            className={`w-full text-left rounded-lg p-3 ${b.bg} hover:opacity-90 transition-opacity`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-semibold ${b.text}`}>{b.label}</span>
              <div className={`text-xs font-mono font-bold ${b.text}`}>
                {b.count} job{b.count !== 1 ? "s" : ""} · ${b.total.toLocaleString()}
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${b.bar} transition-all`}
                style={{ width: `${(b.total / maxVal) * 100}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}