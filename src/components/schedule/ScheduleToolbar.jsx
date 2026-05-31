import React from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, LayoutList, CalendarDays, Users, GanttChart, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ZOOM_LEVELS, formatWindowLabel } from "@/lib/scheduleUtils";

const VIEW_ICONS = {
  Timeline: GanttChart,
  Calendar: CalendarDays,
  Crew: Users,
  List: LayoutList,
};

export default function ScheduleToolbar({
  zoom, onZoomChange,
  viewMode, onViewModeChange,
  windowStart, windowEnd,
  onNavigate, onToday,
  phaseFilter, onPhaseFilter,
  typeFilter, onTypeFilter,
  crewFilter, onCrewFilter,
  search, onSearch,
  allCrew,
  isMobile,
}) {
  const zoomOptions = isMobile ? ZOOM_LEVELS.filter(z => z !== "Quarter") : ZOOM_LEVELS;

  return (
    <div className="shrink-0 space-y-2 mb-3">
      {/* Row 1: Title + View mode + Zoom + Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">Schedule Board</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{formatWindowLabel(zoom, windowStart, windowEnd)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode icons */}
          <div className="flex items-center border rounded-lg overflow-hidden h-8">
            {(isMobile ? ["Timeline", "List"] : ["Timeline", "Calendar", "Crew", "List"]).map((mode, i, arr) => {
              const Icon = VIEW_ICONS[mode];
              return (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  title={mode}
                  className={cn(
                    "flex items-center gap-1 px-2.5 h-full text-xs font-medium transition-colors",
                    i < arr.length - 1 && "border-r",
                    viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {!isMobile && <span>{mode}</span>}
                </button>
              );
            })}
          </div>

          {/* Zoom segmented control */}
          <div className="flex items-center border rounded-lg overflow-hidden h-8">
            {zoomOptions.map((z, i) => (
              <button
                key={z}
                onClick={() => onZoomChange(z)}
                className={cn(
                  "px-3 h-full text-xs font-medium transition-colors",
                  i < zoomOptions.length - 1 && "border-r",
                  zoom === z ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                )}
              >
                {z}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center border rounded-lg overflow-hidden h-8">
            <button onClick={() => onNavigate(-1)} className="px-2 h-full hover:bg-muted transition-colors border-r">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToday} className="px-3 h-full text-xs font-medium hover:bg-muted transition-colors border-r">
              Today
            </button>
            <button onClick={() => onNavigate(1)} className="px-2 h-full hover:bg-muted transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search job..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="h-8 pl-7 text-xs w-40"
          />
          {search && (
            <button onClick={() => onSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        <Select value={phaseFilter} onValueChange={onPhaseFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="All Phases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            <SelectItem value="Measure & Design Approval">Design</SelectItem>
            <SelectItem value="Fabrication">Fabrication</SelectItem>
            <SelectItem value="Powder Coat">Powder Coat</SelectItem>
            <SelectItem value="Ready for Install">Staging</SelectItem>
            <SelectItem value="Install Day">Install</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={onTypeFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Fence">Fence</SelectItem>
            <SelectItem value="Gate">Gate</SelectItem>
            <SelectItem value="Railing">Railing</SelectItem>
            <SelectItem value="Staircase">Staircase</SelectItem>
            <SelectItem value="Custom Structure">Custom</SelectItem>
          </SelectContent>
        </Select>

        {allCrew.length > 0 && (
          <Select value={crewFilter} onValueChange={onCrewFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Crew" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Crew</SelectItem>
              {allCrew.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Active filter chips */}
        {phaseFilter !== "all" && (
          <button onClick={() => onPhaseFilter("all")} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
            Phase: {phaseFilter === "Measure & Design Approval" ? "Design" : phaseFilter}
            <X className="w-3 h-3" />
          </button>
        )}
        {typeFilter !== "all" && (
          <button onClick={() => onTypeFilter("all")} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
            Type: {typeFilter}
            <X className="w-3 h-3" />
          </button>
        )}
        {crewFilter !== "all" && (
          <button onClick={() => onCrewFilter("all")} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
            Crew: {crewFilter}
            <X className="w-3 h-3" />
          </button>
        )}
        {search && (
          <button onClick={() => onSearch("")} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
            "{search}"
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}