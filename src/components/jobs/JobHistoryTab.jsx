import React from "react";
import { format, parseISO, isValid } from "date-fns";
import { ArrowRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BOARD_COLORS = {
  Sales:   "bg-blue-100 text-blue-800",
  Shop:    "bg-amber-100 text-amber-800",
  Billing: "bg-emerald-100 text-emerald-800",
};

function fmt(ts) {
  if (!ts) return "—";
  const d = parseISO(ts);
  return isValid(d) ? format(d, "MMM d, yyyy 'at' h:mm a") : "—";
}

export default function JobHistoryTab({ job }) {
  const history = [...(job.stage_history || [])].reverse(); // newest first

  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No stage history yet. History is logged automatically as the job moves through the pipeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Current position */}
      <div className="flex gap-3 items-start pb-4">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-primary mt-1 shrink-0" />
          <div className="w-0.5 bg-border flex-1 mt-1" />
        </div>
        <div className="pb-4 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">Current</span>
            {job.pipeline_board && (
              <Badge className={`text-xs ${BOARD_COLORS[job.pipeline_board] || ""}`}>{job.pipeline_board} Board</Badge>
            )}
          </div>
          <p className="text-sm text-foreground font-medium mt-0.5">{job.stage || "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{fmt(job.stage_entered_at)}</p>
        </div>
      </div>

      {/* History entries */}
      {history.map((entry, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground/40 bg-background mt-1.5 shrink-0" />
            {i < history.length - 1 && <div className="w-0.5 bg-border flex-1 mt-1" />}
          </div>
          <div className="pb-5 flex-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
              {entry.from_stage && (
                <>
                  <span className="text-foreground/70">{entry.from_stage}</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </>
              )}
              <span className="font-medium text-foreground">{entry.to_stage}</span>
              {entry.to_board && entry.to_board !== entry.from_board && (
                <Badge className={`text-[10px] ml-1 ${BOARD_COLORS[entry.to_board] || ""}`}>→ {entry.to_board}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{fmt(entry.timestamp)}</p>
            {entry.note && (
              <p className="text-xs text-muted-foreground mt-1 bg-muted/40 rounded px-2 py-1 italic">"{entry.note}"</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}