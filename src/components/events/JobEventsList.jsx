import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarDays, Clock, MapPin, Users, Plus, MoreHorizontal, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import EventForm from "@/components/events/EventForm";

const TYPE_COLORS = {
  Measure: "bg-blue-100 text-blue-800 border-blue-200",
  Consultation: "bg-purple-100 text-purple-800 border-purple-200",
  "Site Visit": "bg-amber-100 text-amber-800 border-amber-200",
  Other: "bg-slate-100 text-slate-800 border-slate-200",
};

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function JobEventsList({ job }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["scheduled-events", job.id],
    queryFn: () => base44.entities.ScheduledEvent.filter({ job_id: job.id }, "-date", 100),
    enabled: !!job?.id,
  });

  const upcoming = events.filter(e => e.status === "Scheduled");
  const past = events.filter(e => e.status !== "Scheduled");

  async function changeStatus(event, newStatus) {
    await base44.entities.ScheduledEvent.update(event.id, { status: newStatus });
    qc.invalidateQueries(["scheduled-events", job.id]);
  }

  async function deleteEvent(event) {
    await base44.entities.ScheduledEvent.delete(event.id);
    qc.invalidateQueries(["scheduled-events", job.id]);
  }

  function openEdit(event) {
    setEditEvent(event);
    setFormOpen(true);
  }

  function handleClose() {
    setFormOpen(false);
    setEditEvent(null);
  }

  function handleSaved() {
    qc.invalidateQueries(["scheduled-events", job.id]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Appointments</h3>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { setEditEvent(null); setFormOpen(true); }}>
          <Plus className="w-3.5 h-3.5" /> Schedule
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No appointments scheduled yet.</p>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              {upcoming.map(ev => (
                <EventCard key={ev.id} event={ev} onEdit={openEdit} onDelete={deleteEvent} onChangeStatus={changeStatus} typeColors={TYPE_COLORS} />
              ))}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground font-medium pt-2">Completed / Cancelled</p>
              <div className="space-y-2 opacity-70">
                {past.map(ev => (
                  <EventCard key={ev.id} event={ev} onEdit={openEdit} onDelete={deleteEvent} onChangeStatus={changeStatus} typeColors={TYPE_COLORS} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <EventForm open={formOpen} onClose={handleClose} job={job} event={editEvent} onSaved={handleSaved} />
    </div>
  );
}

function EventCard({ event, onEdit, onDelete, onChangeStatus, typeColors }) {
  return (
    <Card className="bg-card/60">
      <CardContent className="p-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-xs border ${typeColors[event.event_type] || "bg-muted"}`}>{event.event_type}</Badge>
            {event.status !== "Scheduled" && (
              <Badge variant="outline" className="text-xs">{event.status}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{event.date ? format(parseISO(event.date), "EEE, MMM d") : "—"}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
            {event.location && (
              <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin className="w-3 h-3 shrink-0" />{event.location}</span>
            )}
            {event.assigned_user_names?.length > 0 && (
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.assigned_user_names.join(", ")}</span>
            )}
          </div>
          {event.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{event.notes}</p>}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(event)}><Pencil className="w-3.5 h-3.5 mr-2" />Edit</DropdownMenuItem>
            {event.status === "Scheduled" && (
              <>
                <DropdownMenuItem onClick={() => onChangeStatus(event, "Completed")}><CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />Mark Completed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus(event, "Cancelled")}><XCircle className="w-3.5 h-3.5 mr-2 text-amber-600" />Mark Cancelled</DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => onDelete(event)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}