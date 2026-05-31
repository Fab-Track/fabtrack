import React from "react";
import { useNavigate } from "react-router-dom";

const STAGES = [
  "New Lead", "Estimate In Progress", "Estimate Sent",
  "Awaiting Deposit", "Deposit Received",
  "In Fabrication", "Powder Coat", "Install Scheduled",
];

export default function PipelineSnapshot({ jobs }) {
  const navigate = useNavigate();

  const stageData = STAGES.map(stage => {
    const stageJobs = (jobs || []).filter(j =>
      j.stage === stage ||
      (stage === "In Fabrication" && (j.stage === "Fab Queue" || j.status === "In Fabrication")) ||
      (stage === "Powder Coat" && j.status === "Powder Coat")
    );
    const value = stageJobs.reduce((s, j) => s + (j.estimate_total || 0), 0);
    return { stage, count: stageJobs.length, value };
  }).filter(s => s.count > 0);

  if (stageData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No active jobs in pipeline.</p>;
  }

  return (
    <div className="space-y-1.5">
      {stageData.map(({ stage, count, value }) => (
        <button
          key={stage}
          onClick={() => navigate("/jobs")}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left group"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
              {count}
            </span>
            <span className="text-xs font-medium">{stage}</span>
          </div>
          {value > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              ${value.toLocaleString()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}