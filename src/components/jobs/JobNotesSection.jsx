import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { format, parseISO } from "date-fns";

/**
 * Shared job notes log — running list of timestamped notes, newest first.
 * Any org user can view and add. Used on both the Overview and Details tabs.
 */
export default function JobNotesSection({ job }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const notes = job.notes || [];
  const sortedNotes = [...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const addNoteMutation = useMutation({
    mutationFn: (newEntry) => base44.entities.Job.update(job.id, { notes: [...notes, newEntry] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      setText("");
    },
  });

  const handleAdd = () => {
    if (!text.trim()) return;
    addNoteMutation.mutate({
      text: text.trim(),
      author_id: user?.id || "",
      author_name: user?.full_name || "Unknown",
      created_at: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="text-sm"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!text.trim() || addNoteMutation.isPending}
          className="h-9 self-end shrink-0 gap-1.5"
        >
          {addNoteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Add
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          sortedNotes.map((note, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm whitespace-pre-wrap">{note.text}</p>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium">{note.author_name}</span>
                <span>·</span>
                <span>{note.created_at ? format(parseISO(note.created_at), "MMM d, yyyy 'at' h:mm a") : ""}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}