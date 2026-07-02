import React from "react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ArrowUp, ArrowDown, Star, XCircle } from "lucide-react";
import { computePriorityChange } from "@/lib/pipelineHelpers";

/**
 * Explicit priority controls for a job card's "..." menu. Any org user can
 * set/change priority here — this is intentionally the only way to change it,
 * so accidental drags never affect the saved column ranking.
 */
export default function PriorityMenuItems({ job, stage, columnJobs, onApply }) {
  const rank = job.stage_priority?.[stage];
  const isRanked = typeof rank === "number";

  function apply(e, direction) {
    e.preventDefault();
    e.stopPropagation();
    const updates = computePriorityChange(columnJobs, job, stage, direction);
    if (updates.length) onApply(updates);
  }

  return (
    <>
      <DropdownMenuSeparator />
      {!isRanked ? (
        <>
          <DropdownMenuItem className="text-sm gap-2" onClick={e => apply(e, "top")}>
            <Star className="w-3.5 h-3.5" /> Set as Top Priority
          </DropdownMenuItem>
          <DropdownMenuItem className="text-sm gap-2" onClick={e => apply(e, "up")}>
            <ArrowUp className="w-3.5 h-3.5" /> Add to Priority List
          </DropdownMenuItem>
        </>
      ) : (
        <>
          <DropdownMenuItem className="text-sm gap-2" onClick={e => apply(e, "up")}>
            <ArrowUp className="w-3.5 h-3.5" /> Move Priority Up
          </DropdownMenuItem>
          <DropdownMenuItem className="text-sm gap-2" onClick={e => apply(e, "down")}>
            <ArrowDown className="w-3.5 h-3.5" /> Move Priority Down
          </DropdownMenuItem>
          <DropdownMenuItem className="text-sm gap-2" onClick={e => apply(e, "clear")}>
            <XCircle className="w-3.5 h-3.5" /> Clear Priority
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}