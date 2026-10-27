import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { startOfDay, startOfWeek, eachDayOfInterval } from "date-fns";
import { getWindowForZoom, navigateWindow, getDaysInWindow, jobOverlapsWindow, isJobScheduled } from "@/lib/scheduleUtils";
import ScheduleToolbar from "@/components/schedule/ScheduleToolbar";
import TimelineView from "@/components/schedule/TimelineView";
import CalendarView from "@/components/schedule/CalendarView";
import CrewView from "@/components/schedule/CrewView";
import ListView from "@/components/schedule/ListView";
import { useOrgFilter } from "@/lib/orgContext";

const TODAY = startOfDay(new Date());

const STORAGE_KEY = "schedule_prefs";

function loadPrefs() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

function savePrefs(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

export default function Schedule() {
  const isMobile = useIsMobile();
  const prefs = useMemo(() => loadPrefs(), []);

  const [zoom, setZoom] = useState(prefs.zoom || "Week");
  const [viewMode, setViewMode] = useState(
    prefs.viewMode || (isMobile ? "List" : "Timeline")
  );
  const [anchorDate, setAnchorDate] = useState(() => {
    // Start of this week
    return startOfWeek(TODAY, { weekStartsOn: 1 });
  });

  // Filters
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [crewFilter, setCrewFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Persist prefs
  useEffect(() => {
    savePrefs({ zoom, viewMode });
  }, [zoom, viewMode]);

  const orgFilter = useOrgFilter();

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", orgFilter],
    queryFn: () => base44.entities.Job.filter(orgFilter, "-created_date", 300),
  });

  // When zoom changes, snap anchor to the appropriate period boundary
  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    // Re-anchor to start of current period
    const { start } = getWindowForZoom(newZoom, TODAY);
    setAnchorDate(start);
  };

  const handleToday = () => {
    const { start } = getWindowForZoom(zoom, TODAY);
    setAnchorDate(start);
  };

  const handleNavigate = (direction) => {
    setAnchorDate(prev => navigateWindow(zoom, prev, direction));
  };

  const { start: windowStart, end: windowEnd } = useMemo(
    () => getWindowForZoom(zoom, anchorDate),
    [zoom, anchorDate]
  );

  const days = useMemo(() => getDaysInWindow(windowStart, windowEnd), [windowStart, windowEnd]);

  // Unique crew names
  const allCrew = useMemo(() => {
    const names = new Set();
    jobs.forEach(j => (j.assigned_crew_names || []).forEach(n => names.add(n)));
    return [...names].sort();
  }, [jobs]);

  // Filtered jobs
  const visibleJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!isJobScheduled(job)) return false;
      if (!jobOverlapsWindow(job, windowStart, windowEnd)) return false;

      if (phaseFilter !== "all") {
        const hasPhase = (job.schedule_phases || []).some(p => p.name === phaseFilter && p.status !== "complete");
        if (!hasPhase) return false;
      }
      if (typeFilter !== "all" && job.job_type !== typeFilter) return false;
      if (crewFilter !== "all" && !(job.assigned_crew_names || []).includes(crewFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        const match = (job.job_name || "").toLowerCase().includes(q) ||
          (job.job_number || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      const da = a.promised_install_date || a.expected_install_date || "9999";
      const db = b.promised_install_date || b.expected_install_date || "9999";
      return da.localeCompare(db);
    });
  }, [jobs, windowStart, windowEnd, phaseFilter, typeFilter, crewFilter, search]);

  const renderView = () => {
    const props = { jobs: visibleJobs, days, windowStart, windowEnd, zoom };
    switch (viewMode) {
      case "Timeline": return <TimelineView {...props} />;
      case "Calendar": return <CalendarView {...props} />;
      case "Crew": return <CrewView {...props} />;
      case "List": return <ListView {...props} />;
      default: return <TimelineView {...props} />;
    }
  };

  return (
    <div className="p-3 md:p-6 flex flex-col" style={{ height: "calc(100vh - 3.5rem)", minHeight: 0 }}>
      <ScheduleToolbar
        zoom={zoom}
        onZoomChange={handleZoomChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        windowStart={windowStart}
        windowEnd={windowEnd}
        onNavigate={handleNavigate}
        onToday={handleToday}
        phaseFilter={phaseFilter}
        onPhaseFilter={setPhaseFilter}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        crewFilter={crewFilter}
        onCrewFilter={setCrewFilter}
        search={search}
        onSearch={setSearch}
        allCrew={allCrew}
        isMobile={isMobile}
      />

      {/* Job count */}
      <div className="text-xs text-muted-foreground mb-2 shrink-0">
        {visibleJobs.length} job{visibleJobs.length !== 1 ? "s" : ""} in window
      </div>

      {renderView()}
    </div>
  );
}