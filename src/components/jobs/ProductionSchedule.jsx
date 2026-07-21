import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CalendarDays, Check, ChevronDown, ChevronUp,
  Info, Trash2, Ruler, Pencil, Flame, Sparkles, Wrench, Circle,
} from "lucide-react";
import {
  calculateFromInstallDate, calculateFromMeasureDate, normalizePhases,
  getPhaseColors, getPhaseStatus, PHASE_DEFS, ensureWeekday,
} from "@/lib/scheduleHelpers";

const PHASE_ICONS = {
  "Measure": Ruler,
  "Draw/Design": Pencil,
  "Fab": Flame,
  "Powder Coat": Sparkles,
  "Install": Wrench,
};

const LABEL_W = 130;

export default function ProductionSchedule({ job, readOnly = false }) {
  const [expanded, setExpanded] = useState(true);
  const [phases, setPhases] = useState(() => normalizePhases(job.schedule_phases || []));
  const [bumpNotice, setBumpNotice] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setPhases(normalizePhases(job.schedule_phases || []));
  }, [job.schedule_phases]);

  const saveJobMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.update(job.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job", job.id] }),
  });

  const hasSchedule = phases.length > 0;
  const hasManualEdits = phases.some(p => p.manuallyEdited);

  const measureDate = phases.find(p => p.name === "Measure")?.startDate || "";
  const installDate = phases.find(p => p.name === "Install")?.startDate || job.promised_install_date || job.expected_install_date || "";

  function saveSchedule(newPhases) {
    const installPhase = newPhases.find(p => p.name === "Install");
    const data = {
      schedule_phases: newPhases,
      schedule_updated_at: new Date().toISOString(),
    };
    if (!job.schedule_created_at) {
      data.schedule_created_at = new Date().toISOString();
    }
    if (installPhase) {
      data.promised_install_date = installPhase.startDate;
    }
    saveJobMutation.mutate(data);
  }

  function handleMeasureDateChange(val) {
    if (!val) return;
    if (hasManualEdits) {
      setShowConfirm(true);
      setPendingAction({ type: "from-measure", date: val });
      return;
    }
    doRecalculate("from-measure", val);
  }

  function handleInstallDateChange(val) {
    if (!val) return;
    if (hasManualEdits) {
      setShowConfirm(true);
      setPendingAction({ type: "from-install", date: val });
      return;
    }
    doRecalculate("from-install", val);
  }

  function doRecalculate(type, dateStr) {
    const result = type === "from-measure"
      ? calculateFromMeasureDate(dateStr)
      : calculateFromInstallDate(dateStr);
    if (!result) return;

    setPhases(result.phases);
    setBumpNotice(result.wasBumped
      ? `Date was on a weekend — bumped to Monday ${format(parseISO(result.bumpedDate), "MMM d, yyyy")}.`
      : null);
    saveSchedule(result.phases);
  }

  function confirmRecalculation() {
    if (!pendingAction) return;
    if (pendingAction.type === "remove") {
      handleRemoveSchedule();
    } else {
      doRecalculate(pendingAction.type, pendingAction.date);
    }
    setShowConfirm(false);
    setPendingAction(null);
  }

  function handlePhaseDateChange(phaseName, newDate) {
    if (!newDate) return;
    const updated = phases.map(p =>
      p.name === phaseName
        ? {
            ...p,
            startDate: newDate,
            endDate: newDate,
            manuallyEdited: true,
            status: getPhaseStatus(newDate),
          }
        : p
    );
    setPhases(updated);
    saveSchedule(updated);
  }

  function handleRemoveSchedule() {
    saveJobMutation.mutate({
      promised_install_date: null,
      schedule_phases: [],
      schedule_updated_at: new Date().toISOString(),
    });
    setPhases([]);
    setBumpNotice(null);
    setShowConfirm(false);
    setPendingAction(null);
  }

  function handlePhaseStatusToggle(phaseName) {
    if (readOnly) return;
    const updated = phases.map(p => {
      if (p.name !== phaseName) return p;
      const newStatus = p.status === "complete" ? "upcoming" : "complete";
      return {
        ...p,
        status: newStatus,
        completedAt: newStatus === "complete" ? new Date().toISOString() : null,
      };
    });
    setPhases(updated);
    saveSchedule(updated);
  }

  // Gantt timeline calculations
  let timelineStart = null, timelineEnd = null, totalDays = 0;
  if (phases.length > 0) {
    timelineStart = parseISO(phases[0].startDate);
    timelineEnd = parseISO(phases[phases.length - 1].startDate);
    totalDays = Math.max(1, differenceInCalendarDays(timelineEnd, timelineStart) + 2);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayPct = timelineStart
    ? Math.min(100, Math.max(0, (differenceInCalendarDays(today, timelineStart) / totalDays) * 100))
    : null;

  return (
    <div className="border rounded-xl bg-card overflow-hidden mt-4">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 md:px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Production Schedule</span>
          {hasSchedule && (
            <Badge variant="outline" className="text-[10px]">
              {phases.filter(p => p.status === "complete").length}/{phases.length} phases done
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 md:px-5 pb-5 border-t">
          {/* Entry-point date pickers */}
          {!readOnly && (
            <div className="flex flex-col sm:flex-row gap-3 mt-4 mb-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Measure Date</label>
                <Input
                  type="date"
                  value={measureDate}
                  onChange={e => handleMeasureDateChange(e.target.value)}
                  className="h-10 text-sm w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Promised Install Date</label>
                <Input
                  type="date"
                  value={installDate}
                  onChange={e => handleInstallDateChange(e.target.value)}
                  className="h-10 text-sm w-full"
                />
              </div>
              {hasSchedule && (
                <div className="flex items-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => { setShowConfirm(true); setPendingAction({ type: "remove" }); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
                  </Button>
                </div>
              )}
            </div>
          )}

          {readOnly && hasSchedule && (
            <div className="flex gap-3 mt-4 mb-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Measure Date</label>
                <Input type="date" value={measureDate} disabled className="h-10 text-sm w-full" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Promised Install Date</label>
                <Input type="date" value={installDate} disabled className="h-10 text-sm w-full" />
              </div>
            </div>
          )}

          {/* Weekend bump notice */}
          {bumpNotice && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg px-3 py-2 mb-3">
              <Info className="w-3.5 h-3.5 shrink-0" />
              {bumpNotice}
            </div>
          )}

          {/* Confirm dialog for overwriting manual edits */}
          {showConfirm && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {pendingAction?.type === "remove"
                      ? "Remove the entire production schedule for this job?"
                      : "Some phase dates have been manually edited. Recalculating will overwrite those manual changes."}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmRecalculation}>
                  {pendingAction?.type === "remove" ? "Yes, Remove" : "Recalculate All"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowConfirm(false); setPendingAction(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Phase date pickers */}
          {hasSchedule ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Phase dates are auto-calculated as suggestions. Edit any date individually — changes won't shift other phases.
              </p>
              {phases.map((phase) => {
                const Icon = PHASE_ICONS[phase.name] || CalendarDays;
                const colors = getPhaseColors(phase.color);
                return (
                  <PhaseDateRow
                    key={phase.name}
                    phase={phase}
                    icon={Icon}
                    colors={colors}
                    readOnly={readOnly}
                    onDateChange={handlePhaseDateChange}
                    onStatusToggle={handlePhaseStatusToggle}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
              {readOnly
                ? "No production schedule has been created for this job yet."
                : "Set a Measure Date or Promised Install Date above to auto-generate a production schedule with suggested phase dates."}
            </div>
          )}

          {/* Gantt chart */}
          {hasSchedule && timelineStart && (
            <GanttChart
              phases={phases}
              timelineStart={timelineStart}
              totalDays={totalDays}
              todayPct={todayPct}
              readOnly={readOnly}
              onPhaseStatusToggle={handlePhaseStatusToggle}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PhaseDateRow({ phase, icon: Icon, colors, readOnly, onDateChange, onStatusToggle }) {
  return (
    <div className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2">
      <div className={`w-8 h-8 rounded-md ${colors.light} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{phase.name}</span>
          {phase.manuallyEdited && (
            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
              <Pencil className="w-2.5 h-2.5 mr-1" />Edited
            </Badge>
          )}
        </div>
      </div>
      <Input
        type="date"
        value={phase.startDate}
        disabled={readOnly}
        onChange={e => onDateChange(phase.name, e.target.value)}
        className="h-8 text-sm w-auto max-w-[160px]"
      />
      {phase.status === "complete" ? (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={readOnly} onClick={() => onStatusToggle(phase.name)}>
          <Check className="w-3 h-3 mr-1 text-emerald-600" />Done
        </Button>
      ) : (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" disabled={readOnly} onClick={() => onStatusToggle(phase.name)}>
          Mark Done
        </Button>
      )}
    </div>
  );
}

function GanttChart({ phases, timelineStart, totalDays, todayPct, readOnly, onPhaseStatusToggle }) {
  return (
    <div className="mt-4">
      <div className="text-xs text-muted-foreground mb-2">Timeline</div>
      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ minWidth: 480 }}>
          {/* Header dates */}
          <div className="flex text-[10px] text-muted-foreground mb-1 relative" style={{ paddingLeft: LABEL_W }}>
            <span className="absolute" style={{ left: LABEL_W }}>{format(timelineStart, "MMM d")}</span>
            <span className="absolute right-0">{format(parseISO(phases[phases.length - 1].startDate), "MMM d")}</span>
          </div>

          {/* Bars container */}
          <div className="relative border rounded-lg bg-muted/20 py-1">
            {/* Today line */}
            {todayPct !== null && todayPct >= 0 && todayPct <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500/70 z-10 pointer-events-none"
                style={{ left: `calc(${todayPct}% + ${LABEL_W}px)` }}
              >
                <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] px-1 rounded">today</div>
              </div>
            )}

            {phases.map((phase, i) => {
              const nextPhase = phases[i + 1];
              const start = parseISO(phase.startDate);
              const end = nextPhase ? parseISO(nextPhase.startDate) : start;

              const leftPct = (differenceInCalendarDays(start, timelineStart) / totalDays) * 100;
              const widthPct = Math.max(1.5, ((differenceInCalendarDays(end, start) + 1) / totalDays) * 100);

              const colors = getPhaseColors(phase.color);
              const isComplete = phase.status === "complete";

              return (
                <div key={phase.name} className="flex items-center h-9">
                  {/* Sticky label */}
                  <div
                    className="shrink-0 text-xs text-muted-foreground truncate pr-2 flex items-center gap-1 sticky left-0 bg-muted/20 z-10"
                    style={{ width: LABEL_W, minWidth: LABEL_W }}
                  >
                    {isComplete
                      ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      : phase.status === "in_progress"
                        ? <Circle className="w-3 h-3 text-blue-500 shrink-0" />
                        : <Circle className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                    <span className="truncate">{phase.name}</span>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 relative h-6">
                    <div
                      className={`absolute h-full rounded-md flex items-center px-2 overflow-hidden ${colors.bg} ${
                        isComplete ? "opacity-40" : "opacity-80"
                      } ${!readOnly ? "cursor-pointer hover:opacity-100" : ""}`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      onClick={() => !readOnly && onPhaseStatusToggle(phase.name)}
                    >
                      <span className="text-white text-[10px] font-medium truncate whitespace-nowrap select-none">
                        {format(start, "MMM d")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}