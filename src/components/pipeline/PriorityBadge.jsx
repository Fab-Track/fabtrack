import React from "react";
import { Trophy } from "lucide-react";

/**
 * Small rank badge shown on ranked job cards. Top-3 ranks are highlighted
 * so the jobs that matter most are obvious at a glance.
 */
export default function PriorityBadge({ rank }) {
  if (typeof rank !== "number") return null;
  const isTopPriority = rank <= 5;
  return (
    <span
      title={`Priority #${rank}`}
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0 rounded-full shrink-0 ${
        isTopPriority ? "bg-red-600 text-white" : "bg-muted text-muted-foreground border border-border"
      }`}
    >
      {isTopPriority && <Trophy className="w-2.5 h-2.5" />}
      #{rank}
    </span>
  );
}