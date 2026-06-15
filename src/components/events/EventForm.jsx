import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Plus, X, Loader2 } from "lucide-react";

const EVENT_TYPES = ["Measure", "Consultation", "Site Visit", "Other"];

const blankEvent = (job) => ({
  job_id: job?.id || "",
  job_number: job?.job_number || "",
  job_name: job?.job_name || "",
  customer_id: job?.customer_id || "",
  customer_name: job?.customer_name || "",
  event_type: "Measure",
  date: "",
  start_time: "",
  end_time: "",
  location: job?.site_address || "",
  assigned_user_ids: [],
  assigned_user_names: [],
  notes: "",
  status: "Scheduled",
});

export default function EventForm({ open, onClose, job, event, onSaved }) {
  const isEdit = !!event;
  const [form, setForm] = useState(blankEvent(job));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({ ...event });
    } else {
      setForm(blankEvent(job));
    }
  }, [event, job, open]);

  const { data: users = [] } = useQuery({
    queryKey: ["users-for-events"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
    enabled: open,
  });

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleUser(user) {
    setForm(prev => {
      const has = prev.assigned_user_ids.includes(user.id);
      return {
        ...prev,
        assigned_user_ids: has
          ? prev.assigned_user_ids.filter(id => id !== user.id)
          : [...prev.assigned_user_ids, user.id],
        assigned_user_names: has
          ? prev.assigned_user_names.filter(n => n !== (user.full_name || user.email))
          : [...prev.assigned_user_names, user.full_name || user.email],
      };
    });
  }

  async function handleSave() {
    if (!form.date || !form.start_time || !form.end_time) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit) {
        await base44.entities.ScheduledEvent.update(event.id, payload);
      } else {
        await base44.entities.ScheduledEvent.create(payload);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Appointment" : "Schedule Appointment"}</SheetTitle>
          <SheetDescription>
            {job?.job_name} — {job?.job_number}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Event Type */}
          <div>
            <Label>Event Type</Label>
            <Select value={form.event_type} onValueChange={v => update("event_type", v)}>
              <SelectTrigger className="h-10 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" className="h-10 mt-1 text-sm" value={form.date} onChange={e => update("date", e.target.value)} />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" className="h-10 mt-1 text-sm" value={form.start_time} onChange={e => update("start_time", e.target.value)} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" className="h-10 mt-1 text-sm" value={form.end_time} onChange={e => update("end_time", e.target.value)} />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label>Location</Label>
            <Input className="h-10 mt-1 text-sm" value={form.location} onChange={e => update("location", e.target.value)} placeholder="Site address" />
          </div>

          {/* Assigned Team Members */}
          <div>
            <Label className="mb-1.5 block">Team Members</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.assigned_user_names.map((name, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs">
                  {name}
                  <button onClick={() => {
                    const uid = form.assigned_user_ids[i];
                    if (uid) {
                      const u = users.find(x => x.id === uid);
                      if (u) toggleUser(u);
                    }
                  }} className="ml-0.5 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {form.assigned_user_ids.length === 0 && (
                <span className="text-xs text-muted-foreground">None assigned</span>
              )}
            </div>
            <div className="max-h-32 overflow-y-auto border rounded-md divide-y">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary"
                    checked={form.assigned_user_ids.includes(u.id)}
                    onChange={() => toggleUser(u)}
                  />
                  {u.full_name || u.email}
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} className="mt-1 text-sm resize-none" value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Optional notes or description..." />
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger className="h-10 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Scheduled", "Completed", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="h-10 text-sm">Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.date} className="h-10 text-sm gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Update" : "Schedule"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}