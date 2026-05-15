import React from "react";
import { useNavigate } from "react-router-dom";

const FUNNEL_STAGES = [
  { stage: "New Lead",               board: "Sales", color: "bg-blue-500",   width: "w-full" },
  { stage: "Estimate In Progress",   board: "Sales", color: "bg-indigo-500", width: "w-10/12" },
  { stage: "Estimate Sent",          board: "Sales", color: "bg-violet-500", width: "w-9/12" },
  { stage: "Negotiation",            board: "Sales", color: "bg-purple-500", width: "w-7/12" },
  { stage: "Approved",               board: "Sales", color: "bg-accent",     width: "w-5/12" },
  { stage: "Deposit Received",       board: "Sales", color: "bg-green-500",  width: "w-4/12" },
];

export default function SalesFunnelEstimator({ jobs }) {
  const navigate = useNavigate();

  const countByStage = {};
  (jobs || []).forEach(j => {
    if (j.pipeline_board === "Sales" && j.stage) {
      countByStage[j.stage] = (countByStage[j.stage] || 0) + 1;
    }
  });

  const handleClick = (stage) => {
    // Navigate to job board with Sales board — stage filter via URL param
    navigate(`/jobs?board=Sales&stage=${encodeURIComponent(stage)}`);
  };

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-5">Sales Funnel</h3>
      <div className="space-y-2">
        {FUNNEL_STAGES.map(({ stage, color, width }) => {
          const count = countByStage[stage] || 0;
          return (
            <button
              key={stage}
              onClick={() => handleClick(stage)}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs text-muted-foreground w-40 truncate">{stage}</span>
                <span className="text-sm font-bold">{count}</span>
                <span className="text-xs text-muted-foreground">job{count !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-start">
                <div
                  className={`${width} h-8 ${color} rounded-md opacity-90 group-hover:opacity-100 transition-opacity flex items-center px-3`}
                >
                  <span className="text-white text-sm font-bold">{count}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}