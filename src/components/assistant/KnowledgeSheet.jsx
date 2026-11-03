import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Pricing", "Labor", "Materials", "Process", "Customers", "Other"];

export default function KnowledgeSheet({ open, onOpenChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "Pricing" });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["assistant-knowledge", user?.organization_id],
    queryFn: () => base44.entities.AssistantKnowledge.list("-created_date", 200),
    enabled: open && !!user,
  });

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      await base44.entities.AssistantKnowledge.create({
        organization_id: user.organization_id,
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        is_active: true,
        source: "manual",
        created_by_id: user.id,
        created_by_name: user.full_name || user.email || "",
      });
      setForm({ title: "", content: "", category: "Pricing" });
      setAdding(false);
      queryClient.invalidateQueries({ queryKey: ["assistant-knowledge"] });
      toast.success("Saved to company knowledge");
    } catch (e) {
      toast.error(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await base44.entities.AssistantKnowledge.delete(id);
      queryClient.invalidateQueries({ queryKey: ["assistant-knowledge"] });
    } catch (e) {
      toast.error(e.message || "Could not delete");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            Company knowledge
          </SheetTitle>
          <SheetDescription>
            What the assistant has been taught about your shop. It uses these when estimating.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-3">
          {adding ? (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <Input
                placeholder="Title — e.g. Powder coat markup"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Textarea
                placeholder="The rule, in full."
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" />
              Add knowledge
            </Button>
          )}

          {isLoading && (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          )}

          {!isLoading && entries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 leading-relaxed">
              Nothing saved yet. Tell the assistant a rule in chat, or add one here.
            </p>
          )}

          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{entry.title}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px] font-normal">{entry.category}</Badge>
                </div>
                <button
                  onClick={() => remove(entry.id)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}