import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { JOB_STATUSES } from "@/lib/jobHelpers";
import JobCard from "@/components/jobs/JobCard";
import JobRowView from "@/components/jobs/JobRowView";
import { Button } from "@/components/ui/button";
import { Plus, Filter, LayoutGrid, List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLUMN_COLORS = {
  "Estimate": "border-t-gray-400",
  "Approved": "border-t-blue-500",
  "Fab Queue": "border-t-purple-500",
  "In Fabrication": "border-t-amber-500",
  "Powder Coat": "border-t-orange-500",
  "Install Scheduled": "border-t-cyan-500",
  "Install Complete": "border-t-emerald-500",
  "Invoiced": "border-t-gray-300",
};

export default function JobBoard() {
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("kanban");
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 200),
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Job.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const filteredJobs = filterType === "all" ? jobs : jobs.filter(j => j.job_type === filterType);

  const columns = {};
  JOB_STATUSES.forEach(s => { columns[s] = []; });
  filteredJobs.forEach(j => {
    if (columns[j.status]) columns[j.status].push(j);
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (job && job.status !== newStatus) {
      updateJobMutation.mutate({
        id: job.id,
        data: { status: newStatus, last_activity_date: new Date().toISOString() },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex gap-4 overflow-x-auto">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-3.5rem)] md:h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Board</h1>
          <p className="text-sm text-muted-foreground">{jobs.length} total jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Fence">Fence</SelectItem>
              <SelectItem value="Gate">Gate</SelectItem>
              <SelectItem value="Railing">Railing</SelectItem>
              <SelectItem value="Staircase">Staircase</SelectItem>
              <SelectItem value="Custom Structure">Custom Structure</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden h-9">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-2.5 h-full flex items-center transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("row")}
              className={`px-2.5 h-full flex items-center border-l border-border transition-colors ${viewMode === "row" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
              title="Row View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Link to="/jobs/new">
            <Button size="sm" className="h-9">
              <Plus className="w-4 h-4 mr-1.5" />
              New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Kanban board */}
      {viewMode === "kanban" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto flex-1 pb-4">
            {JOB_STATUSES.map(status => (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`shrink-0 w-64 lg:w-72 flex flex-col rounded-xl border border-t-4 ${COLUMN_COLORS[status]} ${snapshot.isDraggingOver ? 'bg-accent/20' : 'bg-muted/30'}`}
                  >
                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{status}</span>
                      <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center">
                        {columns[status].length}
                      </span>
                    </div>
                    <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto min-h-[200px]">
                      {columns[status].map((job, index) => (
                        <Draggable key={job.id} draggableId={job.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <JobCard job={job} isDragging={snapshot.isDragging} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <JobRowView
          jobs={filteredJobs}
          onUpdateJob={(id, data) => updateJobMutation.mutate({ id, data })}
        />
      )}
    </div>
  );
}