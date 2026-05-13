import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isValid, differenceInCalendarDays, addDays } from "date-fns";
import { generateSchedule, getPhaseColors, getPhaseStatus } from "@/lib/scheduleHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CalendarDays, Check, ChevronDown, ChevronUp,
  Info, RefreshCw, Trash2, CheckCircle2, Clock, Circle,
} from "lucide-react";

// ─── Phase Detail Popup ────────────────────────────────────────────────────────
function PhasePopup({ phase, onClose, onMarkComplete, onMarkUpcoming }) {
  const colors = getPhaseColors(phase.color);
  const start = parseISO(phase.startDate);
  const end = parseISO(phase.endDate);
  return (
    <div className="absolute z-50 w-72 bg-card border rounded-xl shadow-xl p-4 top-8 left-0">
      <div className="flex items-start justify-between mb-2">
        <div className={`text-sm font-semibold ${colors.text}`}>{phase.name}</div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Start</span>
          <span className="font-medium">{format(start, "MMM d, yyyy")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">End</span>
          <span className="font-medium">{format(end, "MMM d, yyyy")}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge status={phase.status} />
        </div>
        {phase.completedAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completed</span>
            <span className="text-xs">{format(parseISO(phase.completedAt), "MMM d")}</span>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t">
        {phase.status !== "complete" ? (
          <Button size="sm" className="w-full h-7 text-xs" onClick={onMarkComplete}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Complete
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={onMarkUpcoming}>
            <RefreshCw className="w-3 h-3 mr-1" /> Mark Upcoming
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "complete") return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><Check className="w-2.5 h-2.5 mr-1" />Complete</Badge>;
  if (status === "in_progress") return <Badge className="bg-blue-100 text-blue-700 text-[10px]"><Clock className="w-2.5 h-2.5 mr-1" />In Progress</Badge>;
  return <Badge variant="outline" className="text-[10px]"><Circle className="w-2.5 h-2.5 mr-1" />Upcoming</Badge>;
}

// ─── Gantt Bar Row ─────────────────────────────────────────────────────────────
function GanttBar({ phase, timelineStart, totalDays, onPhaseUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const start = parseISO(phase.startDate);
  const end = parseISO(phase.endDate);
  const colors = getPhaseColors(phase.color);

  const leftPct = (differenceInCalendarDays(start, timelineStart) / totalDays) * 100;
  const widthPct = Math.max(1.5, ((differenceInCalendarDays(end, start) + 1) / totalDays) * 100);

  const isPast = phase.status === "complete";
  const isActive = phase.status === "in_progress";

  return (
    <div className="relative flex items-center h-9 group">
      {/* Label */}
      <div className="w-44 shrink-0 text-xs text-muted-foreground truncate pr-2 flex items-center gap-1">
        {isPast ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : isActive ? <Clock className="w-3 h-3 text-blue-500 shrink-0" /> : <Circle className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
        {phase.name}
      </div>

      {/* Bar track */}
      <div className="flex-1 relative h-6">
        <div
          ref={ref}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          className={`absolute h-full rounded-md cursor-pointer flex items-center px-2 overflow-hidden transition-opacity
            ${colors.bg} ${isPast ? "opacity-40" : isActive ? "opacity-100 ring-1 ring-offset-1 ring-current" : "opacity-80"}
            hover:opacity-100`}
          onClick={() => setOpen(v => !v)}
        >
          <span className="text-white text-[10px] font-medium truncate whitespace-nowrap">
            {format(start, "MMM d")} – {format(end, "MMM d")}
          </span>
        </div>

        {open && (
          <div style={{ left: `${leftPct}%` }} className="absolute top-8 z-50">
            <PhasePopup
              phase={phase}
              onClose={() => setOpen(false)}
              onMarkComplete={() => { onPhaseUpdate(phase.name, "complete"); setOpen(false); }}
              onMarkUpcoming={() => { onPhaseUpdate(phase.name, "upcoming"); setOpen(false); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProductionSchedule({ job }) {
  const [expanded, setExpanded] = useState(true);
  const [promisedDate, setPromisedDate] = useState(job.promised_install_date || "");
  const [preview, setPreview] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "replace" | "remove"
  const queryClient = useQueryClient();

  const saveJobMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.update(job.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job", job.id] }),
  });

  const existingSchedule = job.schedule_phases?.length > 0;

  function handleDateChange(val) {
    setPromisedDate(val);
    if (!val) {
      setPreview(null);
      if (existingSchedule) setShowConfirm(true), setConfirmAction("remove");
      return;
    }
    const result = generateSchedule(val);
    setPreview(result);
    setShowConfirm(false);
  }

  function handleConfirmSchedule() {
    if (existingSchedule && !confirmAction) {
      setShowConfirm(true);
      setConfirmAction("replace");
      return;
    }
    doSave();
  }

  function doSave() {
    if (!preview) return;
    saveJobMutation.mutate({
      promised_install_date: preview.bumpedDate || promisedDate,
      schedule_phases: preview.phases,
      schedule_created_at: existingSchedule ? job.schedule_created_at : new Date().toISOString(),
      schedule_updated_at: new Date().toISOString(),
    });
    setShowConfirm(false);
    setConfirmAction(null);
    setPreview(null);
  }

  function handleRemoveSchedule() {
    saveJobMutation.mutate({
      promised_install_date: null,
      schedule_phases: [],
      schedule_updated_at: new Date().toISOString(),
    });
    setPromisedDate("");
    setPreview(null);
    setShowConfirm(false);
  }

  function handlePhaseUpdate(phaseName, newStatus) {
    const updated = (job.schedule_phases || []).map(p =>
      p.name === phaseName
        ? { ...p, status: newStatus, completedAt: newStatus === "complete" ? new Date().toISOString() : null }
        : p
    );
    saveJobMutation.mutate({
      schedule_phases: updated,
      schedule_updated_at: new Date().toISOString(),
    });
  }

  // Build timeline range
  const phasesToShow = preview?.phases || job.schedule_phases;
  let timelineStart = null, timelineEnd = null, totalDays = 0;
  if (phasesToShow?.length > 0) {
    timelineStart = parseISO(phasesToShow[0].startDate);
    timelineEnd = parseISO(phasesToShow[phasesToShow.length - 1].endDate);
    totalDays = differenceInCalendarDays(timelineEnd, timelineStart) + 2;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayPct = timelineStart ? Math.min(100, Math.max(0, (differenceInCalendarDays(today, timelineStart) / totalDays) * 100)) : null;

  return (
    <div className="border rounded-xl bg-card overflow-hidden mt-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Production Schedule</span>
          {existingSchedule && (
            <Badge variant="outline" className="text-[10px]">
              {job.schedule_phases.filter(p => p.status === "complete").length}/{job.schedule_phases.length} phases done
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t">
          {/* Date input */}
          <div className="flex items-center gap-3 mt-4 mb-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Promised Install Date</label>
              <Input
                type="date"
                value={promisedDate}
                onChange={e => handleDateChange(e.target.value)}
                className="h-9 text-sm max-w-xs"
              />
            </div>
            {preview && (
              <div className="flex gap-2 items-end">
                <Button
                  size="sm"
                  className="h-9"
                  onClick={handleConfirmSchedule}
                  disabled={saveJobMutation.isPending}
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Confirm & Save Schedule
                </Button>
                <Button size="sm" variant="ghost" className="h-9" onClick={() => setPreview(null)}>Cancel</Button>
              </div>
            )}
            {existingSchedule && !preview && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => { setShowConfirm(true); setConfirmAction("remove"); }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove Schedule
              </Button>
            )}
          </div>

          {/* Weekend bump notice */}
          {preview?.wasBumped && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg px-3 py-2 mb-3">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Date was on a weekend — bumped to Monday {format(parseISO(preview.bumpedDate), "MMM d, yyyy")}.
            </div>
          )}

          {/* Tight timeline warning */}
          {preview?.isTight && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ⚠️ This timeline is tighter than our standard 4-week window. Some phases will overlap.
            </div>
          )}

          {/* Replace/Remove confirm dialog */}
          {showConfirm && (
            <div className="bg-muted/60 border rounded-lg p-4 mb-4 space-y-3">
              {confirmAction === "replace" && (
                <>
                  <p className="text-sm font-medium">A schedule already exists for this job. Replace it or keep both?</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={doSave}>Replace Schedule</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>Keep Existing</Button>
                  </div>
                </>
              )}
              {confirmAction === "remove" && (
                <>
                  <p className="text-sm font-medium">Remove the existing production schedule for this job?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={handleRemoveSchedule}>Yes, Remove</Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowConfirm(false); setPromisedDate(job.promised_install_date || ""); }}>Cancel</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Gantt Timeline */}
          {phasesToShow?.length > 0 && timelineStart && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                {preview ? "Preview — not yet saved" : `Schedule: ${format(timelineStart, "MMM d")} – ${format(timelineEnd, "MMM d, yyyy")}`}
              </div>

              {/* Header dates */}
              <div className="ml-44 flex text-[10px] text-muted-foreground mb-1 relative">
                <span className="absolute left-0">{format(timelineStart, "MMM d")}</span>
                <span className="absolute right-0">{format(timelineEnd, "MMM d")}</span>
              </div>

              {/* Bars */}
              <div className="relative border rounded-lg bg-muted/20 px-3 py-2 overflow-hidden">
                {/* Today line */}
                {todayPct !== null && todayPct >= 0 && todayPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-500/70 z-10 pointer-events-none"
                    style={{ left: `calc(${todayPct}% + 176px)` }}
                  >
                    <div className="absolute -top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] px-1 rounded">today</div>
                  </div>
                )}

                {phasesToShow.map((phase) => (
                  <GanttBar
                    key={phase.name}
                    phase={phase}
                    timelineStart={timelineStart}
                    totalDays={totalDays}
                    onPhaseUpdate={handlePhaseUpdate}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3">
                {phasesToShow.map(p => {
                  const c = getPhaseColors(p.color);
                  return (
                    <div key={p.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className={`w-2.5 h-2.5 rounded-sm ${c.bg} ${p.status === "complete" ? "opacity-40" : ""}`} />
                      {p.name}
                      {p.status === "complete" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!phasesToShow?.length && !preview && (
            <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
              Set a Promised Install Date above to auto-generate a production schedule.
            </div>
          )}
        </div>
      )}
    </div>
  );
}