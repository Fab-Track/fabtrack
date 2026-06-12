import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Check, X, Trash2, Pencil, ChevronDown, ChevronUp,
  CalendarDays, AlertTriangle, User,
} from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";

const PRIORITY_COLORS = {
  High:   "bg-red-100 text-red-700 border-red-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low:    "bg-slate-100 text-slate-600 border-slate-200",
};

function TodoForm({ job, creatorName, employees, onSubmit, onCancel, initial }) {
  const isEdit = !!initial;
  const [desc, setDesc] = useState(initial?.description || "");
  const [priority, setPriority] = useState(initial?.priority || "Medium");
  const [dueDate, setDueDate] = useState(initial?.due_date || "");
  const [assigneeId, setAssigneeId] = useState(initial?.assignee_id || "");
  const [assigneeName, setAssigneeName] = useState(initial?.assignee_name || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!desc.trim()) return;
    onSubmit({
      description: desc.trim(),
      priority,
      due_date: dueDate || null,
      assignee_id: assigneeId,
      assignee_name: assigneeName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="What needs to be done?"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" size="sm" disabled={!desc.trim()}>
          {isEdit ? "Save" : <><Plus className="w-4 h-4 mr-1" />Add</>}
        </Button>
        {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}><X className="w-4 h-4" /></Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assigneeId} onValueChange={(val) => {
          setAssigneeId(val);
          const emp = employees.find(e => e.id === val);
          setAssigneeName(emp ? (emp.name || "Team Member") : "Team Member");
        }}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <User className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Assign to..." />
          </SelectTrigger>
          <SelectContent>
            {employees.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-36 h-8 text-xs"
            placeholder="Due date"
          />
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function TodoItem({ todo, employees, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const overdue = todo.due_date && !todo.is_completed && isPast(parseISO(todo.due_date)) && !isToday(parseISO(todo.due_date));
  const dueToday = todo.due_date && !todo.is_completed && isToday(parseISO(todo.due_date));

  if (editing) {
    return (
      <TodoForm
        employees={employees}
        initial={todo}
        onSubmit={(data) => {
          onEdit(todo.id, data);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border group transition-colors ${
      todo.is_completed ? "bg-muted/30 border-muted" : "bg-card border-border hover:border-muted-foreground/30"
    }`}>
      <button
        onClick={() => onToggle(todo)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          todo.is_completed
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-muted-foreground/40 hover:border-emerald-500"
        }`}
      >
        {todo.is_completed && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${todo.is_completed ? "line-through text-muted-foreground" : ""}`}>
          {todo.description}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.Medium}`}>
            {todo.priority}
          </Badge>
          {todo.assignee_name && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> {todo.assignee_name}
            </span>
          )}
          {dueToday && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
              <CalendarDays className="w-3 h-3 mr-0.5" /> Due Today
            </Badge>
          )}
          {overdue && (
            <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
              <AlertTriangle className="w-3 h-3 mr-0.5" /> Overdue
            </Badge>
          )}
          {todo.due_date && !overdue && !dueToday && !todo.is_completed && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {format(parseISO(todo.due_date), "MMM d")}
            </span>
          )}
          {todo.is_completed && todo.completed_by_name && (
            <span className="text-[10px] text-muted-foreground">
              completed by {todo.completed_by_name}
            </span>
          )}
        </div>
      </div>

      {!todo.is_completed && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(todo.id)}>
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function JobTodosTab({ job }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["jobTodos", job.id],
    queryFn: () => base44.entities.JobTodo.filter({ job_id: job.id }, "-created_date", 100),
    enabled: !!job.id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("name", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.JobTodo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobTodos", job.id] });
      queryClient.invalidateQueries({ queryKey: ["myTodos"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobTodo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobTodos", job.id] });
      queryClient.invalidateQueries({ queryKey: ["myTodos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobTodo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobTodos", job.id] });
      queryClient.invalidateQueries({ queryKey: ["myTodos"] });
    },
  });

  const handleAdd = (data) => {
    createMutation.mutate({
      job_id: job.id,
      job_number: job.job_number,
      job_name: job.job_name,
      customer_name: job.customer_name,
      ...data,
    });
    setShowForm(false);
  };

  const handleToggle = (todo) => {
    const now = new Date().toISOString();
    if (todo.is_completed) {
      updateMutation.mutate({ id: todo.id, data: { is_completed: false, completed_at: null, completed_by_id: null, completed_by_name: null } });
    } else {
      updateMutation.mutate({
        id: todo.id,
        data: {
          is_completed: true,
          completed_at: now,
          completed_by_id: user?.id,
          completed_by_name: user?.full_name || "Team Member",
        },
      });
    }
  };

  const handleEdit = (id, data) => {
    updateMutation.mutate({ id, data });
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const pending = todos.filter(t => !t.is_completed);
  const completed = todos.filter(t => t.is_completed);

  const sortedPending = [...pending].sort((a, b) => {
    const pOrder = { High: 0, Medium: 1, Low: 2 };
    if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    return 0;
  });

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">To-Dos</h3>
          <Badge variant="outline" className="text-xs">{pending.length} open</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)} disabled={showForm}>
          <Plus className="w-4 h-4 mr-1" /> Add To-Do
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <TodoForm
          job={job}
          creatorName={user?.full_name}
          employees={employees}
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Pending to-dos */}
      {sortedPending.length === 0 && completed.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No to-dos yet. Add one to track reminders and follow-ups for this job.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {sortedPending.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                employees={employees}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Completed to-dos */}
          {completed.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {showCompleted ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {completed.length} Completed
              </button>
              {showCompleted && (
                <div className="space-y-2 mt-1">
                  {completed.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      employees={employees}
                      onToggle={handleToggle}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}