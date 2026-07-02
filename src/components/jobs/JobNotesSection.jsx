import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, ListTodo, User, Check, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO } from "date-fns";

/**
 * Shared job notes log — running list of timestamped notes, newest first.
 * Any org user can view and add. A note can optionally be marked as a To-Do,
 * with an optional assignee and due date, and checked off when complete.
 */
export default function JobNotesSection({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [asTodo, setAsTodo] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("name", 200),
  });

  const notes = job.notes || [];
  const sortedNotes = [...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const saveNotesMutation = useMutation({
    mutationFn: (newNotes) => base44.entities.Job.update(job.id, { notes: newNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job", job.id] }),
  });

  const resetForm = () => {
    setText("");
    setAsTodo(false);
    setAssigneeId("");
    setAssigneeName("");
    setDueDate("");
  };

  const handleAdd = () => {
    if (!text.trim()) return;
    const entry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      author_id: user?.id || "",
      author_name: user?.full_name || "Unknown",
      created_at: new Date().toISOString(),
      is_todo: asTodo,
      is_completed: false,
      assignee_id: asTodo ? assigneeId : "",
      assignee_name: asTodo ? assigneeName : "",
      due_date: asTodo ? (dueDate || "") : "",
    };
    saveNotesMutation.mutate([...notes, entry]);
    resetForm();
  };

  const updateNote = (id, changes) => {
    const updated = notes.map(n => (n.id === id ? { ...n, ...changes } : n));
    saveNotesMutation.mutate(updated);
  };

  const handleMakeTodo = (note) => updateNote(note.id, { is_todo: true, is_completed: false });

  const handleToggleComplete = (note) => {
    if (note.is_completed) {
      updateNote(note.id, { is_completed: false, completed_at: null, completed_by_id: null, completed_by_name: null });
    } else {
      updateNote(note.id, {
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by_id: user?.id,
        completed_by_name: user?.full_name || "Team Member",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={asTodo ? "default" : "outline"}
            onClick={() => setAsTodo(!asTodo)}
            className="h-8 gap-1.5 text-xs"
          >
            <ListTodo className="w-3.5 h-3.5" /> {asTodo ? "To-Do" : "Make this a To-Do"}
          </Button>

          {asTodo && (
            <>
              <Select value={assigneeId} onValueChange={(val) => {
                setAssigneeId(val);
                const emp = employees.find(e => e.id === val);
                setAssigneeName(emp ? (emp.name || "Team Member") : "");
              }}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <User className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-36 h-8 text-xs"
              />
            </>
          )}

          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!text.trim() || saveNotesMutation.isPending}
            className="h-8 gap-1.5 ml-auto"
          >
            {saveNotesMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          sortedNotes.map((note) => (
            <div
              key={note.id || note.created_at}
              className={`rounded-lg border p-3 flex items-start gap-2.5 ${
                note.is_todo
                  ? note.is_completed ? "bg-muted/30 border-muted" : "bg-accent/5 border-accent/30"
                  : "bg-muted/30 border-border"
              }`}
            >
              {note.is_todo && (
                <button
                  onClick={() => handleToggleComplete(note)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    note.is_completed
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-muted-foreground/40 hover:border-emerald-500"
                  }`}
                >
                  {note.is_completed && <Check className="w-3 h-3" />}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm whitespace-pre-wrap ${note.is_todo && note.is_completed ? "line-through text-muted-foreground" : ""}`}>
                  {note.text}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <span className="font-medium">{note.author_name}</span>
                  <span>·</span>
                  <span>{note.created_at ? format(parseISO(note.created_at), "MMM d, yyyy 'at' h:mm a") : ""}</span>
                  {note.is_todo && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded-full border border-accent/30">
                      <ListTodo className="w-3 h-3" /> {note.assignee_name || "Unassigned"}
                    </span>
                  )}
                  {note.is_todo && note.due_date && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CalendarDays className="w-3 h-3" /> {format(parseISO(note.due_date), "MMM d")}
                    </span>
                  )}
                  {!note.is_todo && (
                    <button
                      onClick={() => handleMakeTodo(note)}
                      className="text-[10px] underline hover:text-foreground"
                    >
                      Make this a To-Do
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}