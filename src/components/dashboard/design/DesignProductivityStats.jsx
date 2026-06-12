import React, { useState } from "react";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parseISO, isWithinInterval, differenceInDays, isValid } from "date-fns";
import DashWidget from "@/components/dashboard/shared/DashWidget";

const RANGES = ["Month", "Quarter", "Year"];

// Stages that indicate a measure was just completed (job moved OUT of measure into drawing)
const MEASURE_COMPLETE_STAGES = ["Needs Drawing", "Drawing Needs Approval", "On Deck for Fabrication", "Fabricate", "Fabrication Complete — Needs Powder Coat", "At Powder Coat", "Ready for Install", "Install in Progress / Not Complete", "Install Complete"];
// Stages that indicate a drawing was completed
const DRAWING_COMPLETE_STAGES = ["On Deck for Fabrication", "Fabricate", "Fabrication Complete — Needs Powder Coat", "At Powder Coat", "Ready for Install", "Install in Progress / Not Complete", "Install Complete"];

function getRangeInterval(range) {
  const today = new Date();
  if (range === "Month") return { start: startOfMonth(today), end: endOfMonth(today) };
  if (range === "Quarter") return { start: startOfQuarter(today), end: endOfQuarter(today) };
  return { start: startOfYear(today), end: endOfYear(today) };
}

function jobInInterval(job, interval) {
  const d = job.updated_date ? parseISO(job.updated_date) : null;
  return d && isValid(d) && isWithinInterval(d, interval);
}

function getMeasureCycleTime(job) {
  // Try to find measure-complete and drawing-complete timestamps from stage_history
  const history = job.stage_history || [];
  const measureEntry = history.find(h => MEASURE_COMPLETE_STAGES.includes(h.to_stage));
  const drawingEntry = history.find(h => DRAWING_COMPLETE_STAGES.includes(h.to_stage));
  if (!measureEntry || !drawingEntry) return null;
  const mDate = parseISO(measureEntry.timestamp);
  const dDate = parseISO(drawingEntry.timestamp);
  if (!isValid(mDate) || !isValid(dDate) || dDate <= mDate) return null;
  return differenceInDays(dDate, mDate);
}

export default function DesignProductivityStats({ jobs, currentUserId, currentUserName }) {
  const [range, setRange] = useState("Month");
  const [viewMode, setViewMode] = useState("mine"); // "mine" | "team"

  const interval = getRangeInterval(range);

  const relevantJobs = jobs.filter(j => jobInInterval(j, interval));

  const measuresCompleted = relevantJobs.filter(j =>
    MEASURE_COMPLETE_STAGES.includes(j.stage) && j.pipeline_board === "Shop"
  ).length;

  const drawingsCompleted = relevantJobs.filter(j =>
    DRAWING_COMPLETE_STAGES.includes(j.stage) && j.pipeline_board === "Shop"
  ).length;

  // Cycle times
  const cycleTimes = jobs
    .map(getMeasureCycleTime)
    .filter(t => t !== null && t >= 0);
  const avgCycleTime = cycleTimes.length > 0
    ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
    : null;

  return (
    <DashWidget title="Productivity & Throughput">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex rounded-lg border overflow-hidden text-xs">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 font-medium transition-colors ${range === r ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border overflow-hidden text-xs ml-auto">
          <button
            onClick={() => setViewMode("mine")}
            className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "mine" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            My Numbers
          </button>
          <button
            onClick={() => setViewMode("team")}
            className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "team" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Team Total
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-sky-50 rounded-lg p-3 border border-sky-100">
          <p className="text-2xl font-bold text-sky-700">{measuresCompleted}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Measures Completed</p>
        </div>
        <div className="text-center bg-violet-50 rounded-lg p-3 border border-violet-100">
          <p className="text-2xl font-bold text-violet-700">{drawingsCompleted}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Drawings Completed</p>
        </div>
        <div className="text-center bg-amber-50 rounded-lg p-3 border border-amber-100">
          <p className="text-2xl font-bold text-amber-700">{avgCycleTime !== null ? `${avgCycleTime}d` : "—"}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Avg Measure→Drawing</p>
        </div>
      </div>

      {viewMode === "team" && (
        <p className="text-[10px] text-muted-foreground mt-3 text-center italic">Showing all team activity for this {range.toLowerCase()}.</p>
      )}
      {viewMode === "mine" && (
        <p className="text-[10px] text-muted-foreground mt-3 text-center italic">Showing jobs assigned to {currentUserName || "you"} for this {range.toLowerCase()}.</p>
      )}
    </DashWidget>
  );
}