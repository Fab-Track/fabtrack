import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { JOB_STATUSES, STATUS_COLORS, getJobHealth, getHealthBorder } from "@/lib/jobHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import {
  ChevronDown, ChevronRight, GripVertical,
  CalendarDays, Users, Paintbrush, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SECTION_BORDER = {
  "Estimate":          "border-l-gray-400",
  "Approved":          "border-l-blue-500",
  "Fab Queue":         "border-l-purple-500",
  "In Fabrication":    "border-l-amber-500",
  "Powder Coat":       "border-l-orange-500",
  "Install Scheduled": "border-l-cyan-500",
  "Install Complete":  "border-l-emerald-500",
  "Invoiced":          "border-l-gray-300",
};

const SECTION_BG = {
  "Estimate":          "bg-gray-50 border-gray-200",
  "Approved":          "bg-blue-50 border-blue-200",
  "Fab Queue":         "bg-purple-50 border-purple-200",
  "In Fabrication":    "bg-amber-50 border-amber-200",
  "Powder Coat":       "bg-orange-50 border-orange-200",
  "Install Scheduled": "bg-cyan-50 border-cyan-200",
  "Install Complete":  "bg-emerald-50 border-emerald-200",
  "Invoiced":          "bg-gray-50 border-gray-200",
};

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <span className="text-muted-foreground/30 ml-1">↕</span>;
  return <span className="text-muted-foreground ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

function JobRow({ job, index, onStatusChange }) {
  const navigate = useNavigate();
  const health = getJobHealth(job);
  const healthBorder = getHealthBorder(health);

  const installDate = job.expected_install_date && isValid(parseISO(job.expected_install_date))
    ? format(parseISO(job.expected_install_date), "MMM d, yyyy")
    : "—";

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group flex items-center gap-0 border-b last:border-b-0 border-border/50 bg-card transition-all
            ${snapshot.isDragging ? "shadow-lg ring-1 ring-accent/40 rounded-lg opacity-95 z-50" : "hover:bg-muted/30"}`}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="px-2 py-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground/50"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Health indicator */}
          <div className={`self-stretch w-1 shrink-0 rounded-sm border-l-2 ${healthBorder} mr-3`} />

          {/* Job # */}
          <div className="w-32 shrink-0 text-xs font-mono text-muted-foreground truncate">{job.job_number || "—"}</div>

          {/* Job Name */}
          <div className="flex-1 min-w-0 pr-4">
            <Link
              to={`/jobs/${job.id}`}
              className="text-sm font-medium hover:text-accent transition-colors line-clamp-1"
              onClick={e => e.stopPropagation()}
            >
              {job.job_name}
            </Link>
          </div>

          {/* Customer */}
          <div className="w-36 shrink-0 text-sm text-muted-foreground truncate pr-4">{job.customer_name || "—"}</div>

          {/* Type */}
          <div className="w-32 shrink-0 pr-3">
            {job.job_type
              ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{job.job_type}</Badge>
              : <span className="text-muted-foreground/40 text-xs">—</span>}
          </div>

          {/* Powder Coat */}
          <div className="w-36 shrink-0 pr-3">
            {job.powder_coat_color
              ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><Paintbrush className="w-3 h-3 shrink-0" /><span className="truncate">{job.powder_coat_color}</span></div>
              : <span className="text-muted-foreground/40 text-xs">—</span>}
          </div>

          {/* Install Date */}
          <div className="w-28 shrink-0 pr-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3 shrink-0" />
              {installDate}
            </div>
          </div>

          {/* Assigned */}
          <div className="w-20 shrink-0 pr-3">
            {job.assigned_crew_names?.length > 0
              ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />{job.assigned_crew_names.length}</div>
              : <span className="text-muted-foreground/40 text-xs">—</span>}
          </div>

          {/* Status badge */}
          <div className="w-36 shrink-0 pr-2">
            <Badge className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[job.status] || ""}`}>{job.status}</Badge>
          </div>

          {/* Actions */}
          <div className="w-8 shrink-0 mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>Open Job</DropdownMenuItem>
                {JOB_STATUSES.filter(s => s !== job.status).map(s => (
                  <DropdownMenuItem key={s} onClick={() => onStatusChange(job.id, s)}>
                    Move → {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function SectionHeader({ status, count, expanded, onToggle }) {
  const bg = SECTION_BG[status] || "bg-muted/40 border-muted";
  const border = SECTION_BORDER[status] || "border-l-gray-400";
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-4 py-2.5 border-l-4 ${border} ${bg} border-y text-left hover:brightness-95 transition-all`}
    >
      {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      <span className="text-sm font-semibold tracking-wide">{status}</span>
      <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 text-muted-foreground border border-current/20">
        {count}
      </span>
    </button>
  );
}

export default function JobRowView({ jobs, onUpdateJob }) {
  const [collapsed, setCollapsed] = useState({});
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // Build ordered sections from jobs (maintain drag order via index)
  const [sections, setSections] = useState(() => {
    const s = {};
    JOB_STATUSES.forEach(st => { s[st] = []; });
    jobs.forEach(j => { if (s[j.status]) s[j.status].push(j); });
    return s;
  });

  // Keep sections in sync when jobs prop changes (but not during drag)
  const [isDragging, setIsDragging] = useState(false);
  useMemo(() => {
    if (isDragging) return;
    const s = {};
    JOB_STATUSES.forEach(st => { s[st] = []; });
    jobs.forEach(j => { if (s[j.status]) s[j.status].push(j); });
    setSections(s);
  }, [jobs, isDragging]);

  function toggleCollapse(status) {
    setCollapsed(c => ({ ...c, [status]: !c[status] }));
  }

  function handleColumnSort(col) {
    if (sortKey === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("asc"); }
  }

  function sortedJobs(jobList) {
    if (!sortKey) return jobList;
    return [...jobList].sort((a, b) => {
      let va, vb;
      if (sortKey === "job_number") { va = a.job_number || ""; vb = b.job_number || ""; }
      else if (sortKey === "customer") { va = a.customer_name || ""; vb = b.customer_name || ""; }
      else if (sortKey === "install_date") { va = a.expected_install_date || "9999"; vb = b.expected_install_date || "9999"; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  function handleDragStart() { setIsDragging(true); }

  function handleDragEnd(result) {
    setIsDragging(false);
    if (!result.destination) return;
    const { draggableId, source, destination } = result;

    const srcStatus = source.droppableId;
    const dstStatus = destination.droppableId;

    // Build new sections optimistically
    setSections(prev => {
      const next = {};
      JOB_STATUSES.forEach(st => { next[st] = [...(prev[st] || [])]; });
      const job = next[srcStatus].find(j => j.id === draggableId);
      if (!job) return prev;
      next[srcStatus].splice(source.index, 1);
      const updatedJob = dstStatus !== srcStatus ? { ...job, status: dstStatus } : job;
      next[dstStatus].splice(destination.index, 0, updatedJob);
      return next;
    });

    if (srcStatus !== dstStatus) {
      onUpdateJob(draggableId, { status: dstStatus, last_activity_date: new Date().toISOString() });
    }
  }

  const TH = ({ col, label, className = "" }) => (
    <button
      onClick={() => handleColumnSort(col)}
      className={`text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors ${className}`}
    >
      {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </button>
  );

  return (
    <div className="flex flex-col gap-0 overflow-y-auto flex-1 pb-6">
      {/* Column headers */}
      <div className="flex items-center gap-0 px-4 py-2 border-b bg-muted/40 sticky top-0 z-10">
        <div className="w-6 shrink-0 mr-2" /> {/* drag handle space */}
        <div className="w-1 mr-3 shrink-0" /> {/* health bar */}
        <TH col="job_number" label="Job #" className="w-32 shrink-0" />
        <div className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-4">Job Name</div>
        <TH col="customer" label="Customer" className="w-36 shrink-0 pr-4" />
        <div className="w-32 shrink-0 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</div>
        <div className="w-36 shrink-0 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Powder Coat</div>
        <TH col="install_date" label="Install Date" className="w-28 shrink-0 pr-3" />
        <div className="w-20 shrink-0 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crew</div>
        <div className="w-36 shrink-0 pr-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</div>
        <div className="w-8 shrink-0 mr-2" />
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {JOB_STATUSES.map(status => {
          const jobsInSection = sections[status] || [];
          const sorted = sortedJobs(jobsInSection);
          const isCollapsed = collapsed[status];
          return (
            <div key={status} className="border-b border-border/30">
              <SectionHeader
                status={status}
                count={jobsInSection.length}
                expanded={!isCollapsed}
                onToggle={() => toggleCollapse(status)}
              />
              {!isCollapsed && (
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[40px] transition-colors ${snapshot.isDraggingOver ? "bg-accent/10" : ""}`}
                    >
                      {sorted.map((job, index) => (
                        <JobRow
                          key={job.id}
                          job={job}
                          index={index}
                          onStatusChange={(id, newStatus) =>
                            onUpdateJob(id, { status: newStatus, last_activity_date: new Date().toISOString() })
                          }
                        />
                      ))}
                      {provided.placeholder}
                      {sorted.length === 0 && (
                        <div className="py-3 px-10 text-xs text-muted-foreground/50 italic">No jobs</div>
                      )}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
}