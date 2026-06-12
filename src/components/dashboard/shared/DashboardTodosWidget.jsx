import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, CalendarDays, AlertTriangle, User } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";

const PRIORITY_COLORS = {
  High:   "bg-red-100 text-red-700 border-red-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low:    "bg-slate-100 text-slate-600 border-slate-200",
};

export default function DashboardTodosWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["myTodos"],
    queryFn: async () => {
      const all = await base44.entities.JobTodo.filter({}, "-created_date", 300);
      return all.filter(t => {
        if (t.is_completed) return false;
        return t.assignee_id === user?.id || t.created_by_id === user?.id;
      });
    },
    refetchInterval: 2 * 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobTodo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTodos"] });
      queryClient.invalidateQueries({ queryKey: ["jobTodos"] });
    },
  });

  const handleToggle = (todo, e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMutation.mutate({
      id: todo.id,
      data: {
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by_id: user?.id,
        completed_by_name: user?.full_name || "Team Member",
      },
    });
  };

  const sorted = [...todos].sort((a, b) => {
    const pOrder = { High: 0, Medium: 1, Low: 2 };
    if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    return 0;
  });

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;

  if (sorted.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">My To-Dos</h3>
          <Badge variant="outline" className="text-xs">{sorted.length}</Badge>
        </div>
      </div>

      <div className="divide-y">
        {sorted.slice(0, 8).map(todo => {
          const overdue = todo.due_date && isPast(parseISO(todo.due_date)) && !isToday(parseISO(todo.due_date));
          const dueToday = todo.due_date && isToday(parseISO(todo.due_date));
          return (
            <Link
              key={todo.id}
              to={`/jobs/${todo.job_id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
            >
              <button
                onClick={(e) => handleToggle(todo, e)}
                className="w-5 h-5 rounded-full border-2 border-muted-foreground/40 hover:border-emerald-500 flex items-center justify-center shrink-0 transition-colors"
              >
                <Check className="w-3 h-3 opacity-0 group-hover:opacity-60 text-emerald-500" />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{todo.description}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {todo.job_number && (
                    <span className="text-[10px] font-mono text-muted-foreground">{todo.job_number}</span>
                  )}
                  {todo.job_name && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{todo.job_name}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {todo.assignee_id !== todo.created_by_id && todo.assignee_name && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <User className="w-3 h-3" />{todo.assignee_name.split(" ")[0]}
                  </span>
                )}
                <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.Medium}`}>
                  {todo.priority}
                </Badge>
                {dueToday && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                    <CalendarDays className="w-3 h-3 mr-0.5" /> Today
                  </Badge>
                )}
                {overdue && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
                    <AlertTriangle className="w-3 h-3 mr-0.5" /> Overdue
                  </Badge>
                )}
                {todo.due_date && !overdue && !dueToday && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(todo.due_date), "MMM d")}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
            </Link>
          );
        })}
      </div>

      {sorted.length > 8 && (
        <div className="px-4 py-2 border-t text-center">
          <Link to="/jobs" className="text-xs text-muted-foreground hover:text-foreground">
            +{sorted.length - 8} more to-dos across other jobs
          </Link>
        </div>
      )}
    </div>
  );
}