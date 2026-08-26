import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useOrgFilter } from "@/lib/orgContext";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, User, CalendarDays, Plus, ListTodo } from "lucide-react";
import { format, parseISO } from "date-fns";
import NewTaskDialog from "./NewTaskDialog";

/**
 * Dashboard-wide To-Do list, sourced from To-Do notes across all jobs.
 * Visible to everyone regardless of assignment; assignee is shown, not enforced.
 */
export default function DashboardTodoList() {
  const { user } = useAuth();
  const orgFilter = useOrgFilter();
  const qc = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["dashboardTodoJobs", orgFilter],
    queryFn: () => base44.entities.Job.filter(orgFilter, "-updated_date", 500),
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboardTasks", orgFilter],
    queryFn: () => base44.entities.Task.filter(orgFilter, "-created_date", 200),
    refetchInterval: 2 * 60 * 1000,
  });

  const completeMutation = useMutation({
    mutationFn: ({ jobId, notes }) => base44.entities.Job.update(jobId, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboardTodoJobs"] });
      qc.invalidateQueries({ queryKey: ["job"] });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => base44.entities.Task.update(taskId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboardTasks"] });
    },
  });

  // Job-based todos (from job notes)
  const jobTodos = jobs.flatMap(job =>
    (job.notes || [])
      .filter(n => n.is_todo)
      .map(n => ({ ...n, _type: "job", job_id: job.id, job_number: job.job_number, job_name: job.job_name }))
  );

  // General tasks (not tied to a job)
  const generalTasks = tasks.map(t => ({ ...t, _type: "task", text: t.title }));

  const allTodos = [...jobTodos, ...generalTasks];

  let filtered = allTodos.filter(t => showCompleted || !t.is_completed);
  if (onlyMine) filtered = filtered.filter(t => t.assignee_id === user?.id);
  filtered.sort((a, b) => {
    const aDate = a.created_at || a.created_date || "";
    const bDate = b.created_at || b.created_date || "";
    return new Date(bDate) - new Date(aDate);
  });

  const isLoading = jobsLoading || tasksLoading;

  const handleComplete = (todo, e) => {
    e.preventDefault();
    e.stopPropagation();
    const nowCompleted = !todo.is_completed;
    const completionData = {
      is_completed: nowCompleted,
      completed_at: nowCompleted ? new Date().toISOString() : null,
      completed_by_id: nowCompleted ? user?.id : null,
      completed_by_name: nowCompleted ? (user?.full_name || "Team Member") : null,
    };

    if (todo._type === "task") {
      completeTaskMutation.mutate({ taskId: todo.id, data: completionData });
      return;
    }

    const job = jobs.find(j => j.id === todo.job_id);
    if (!job) return;
    const updatedNotes = (job.notes || []).map(n =>
      n.id === todo.id ? { ...n, ...completionData } : n
    );
    completeMutation.mutate({ jobId: job.id, notes: updatedNotes });
  };

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">To-Do List</h3>
          <Badge variant="outline" className="text-xs">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => setShowNewTask(true)}>
            <Plus className="w-3.5 h-3.5" /> New Task
          </Button>
          <Button size="sm" variant={onlyMine ? "default" : "outline"} className="h-7 text-xs" onClick={() => setOnlyMine(!onlyMine)}>
            {onlyMine ? "Showing Mine" : "Show Mine"}
          </Button>
          <Button size="sm" variant={showCompleted ? "default" : "outline"} className="h-7 text-xs" onClick={() => setShowCompleted(!showCompleted)}>
            {showCompleted ? "Hide Completed" : "Show Completed"}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No to-dos to show.</p>
      ) : (
        <div className="divide-y">
          {filtered.slice(0, 20).map(todo => {
            const isTask = todo._type === "task";
            const content = (
              <>
                <button
                  onClick={(e) => handleComplete(todo, e)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    todo.is_completed
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-muted-foreground/40 hover:border-emerald-500"
                  }`}
                >
                  {todo.is_completed && <Check className="w-3 h-3" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${todo.is_completed ? "line-through text-muted-foreground" : ""}`}>{todo.text}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {isTask ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
                        <ListTodo className="w-3 h-3" /> General Task
                      </span>
                    ) : (
                      <>
                        {todo.job_number && <span className="text-[10px] font-mono text-muted-foreground">{todo.job_number}</span>}
                        {todo.job_name && <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{todo.job_name}</span>}
                      </>
                    )}
                    {todo.priority && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        todo.priority === "High" ? "text-red-700 bg-red-100" :
                        todo.priority === "Low" ? "text-gray-600 bg-gray-100" :
                        "text-amber-700 bg-amber-100"
                      }`}>
                        {todo.priority}
                      </span>
                    )}
                    {todo.due_date && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">
                        <CalendarDays className="w-3 h-3" /> Due {format(parseISO(todo.due_date), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <User className="w-3 h-3" />{todo.assignee_name || "Unassigned"}
                  </span>
                  {!isTask && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
                </div>
              </>
            );

            if (isTask) {
              return (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={todo.id}
                to={`/jobs/${todo.job_id}?tab=overview&note=${todo.id}#job-notes-section`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
              >
                {content}
              </Link>
            );
          })}
        </div>
      )}

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} />
    </div>
  );
}