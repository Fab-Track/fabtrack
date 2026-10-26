import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Ruler, Wrench, FileClock } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";

export default function KeyDatesCard({ job }) {
  const qc = useQueryClient();

  // Fetch scheduled events for this job to find the Measure appointment
  const { data: events = [] } = useQuery({
    queryKey: ["scheduled-events", job.id],
    queryFn: () => base44.entities.ScheduledEvent.filter({ job_id: job.id }, "date", 100),
    enabled: !!job?.id,
  });

  const deadlineMutation = useMutation({
    mutationFn: (date) => base44.entities.Job.update(job.id, { estimate_deadline: date || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job.id] });
    },
  });

  // Find the next upcoming (or most recent) Measure event
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const measureEvents = events
    .filter(e => e.event_type === "Measure" && e.status === "Scheduled")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const upcomingMeasure = measureEvents.find(e => {
    if (!e.date) return false;
    return isAfter(parseISO(e.date), today) || parseISO(e.date).getTime() === today.getTime();
  });
  const measureEvent = upcomingMeasure || measureEvents[measureEvents.length - 1] || null;
  const measureDate = measureEvent?.date || null;

  // Install date — promised_install_date is the primary field, expected_install_date as fallback
  const installDate = job.promised_install_date || job.expected_install_date || null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          Key Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DateRow icon={Ruler} label="Measure Date" date={measureDate} />
        <DateRow icon={Wrench} label="Install Date" date={installDate} />
        <EstimateDeadlineRow
          date={job.estimate_deadline}
          onSave={(date) => deadlineMutation.mutate(date)}
          saving={deadlineMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}

function DateRow({ icon: Icon, label, date }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className={`text-sm font-medium ${date ? "" : "text-muted-foreground"}`}>
        {date ? format(parseISO(date), "MMM d, yyyy") : "Not scheduled"}
      </span>
    </div>
  );
}

function EstimateDeadlineRow({ date, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(date || "");

  const handleSave = () => {
    onSave(value);
    setEditing(false);
  };

  const handleClear = () => {
    setValue("");
    onSave("");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 shrink-0">
          <FileClock className="w-3.5 h-3.5" />
          Est. Deadline
        </span>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={value || ""}
            onChange={(e) => setValue(e.target.value)}
            className="h-7 rounded border border-border bg-background px-1.5 text-xs"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            Save
          </button>
          {date && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <FileClock className="w-3.5 h-3.5" />
        Est. Deadline
      </span>
      <button
        onClick={() => { setValue(date || ""); setEditing(true); }}
        className={`text-sm font-medium hover:underline ${date ? "" : "text-muted-foreground"}`}
      >
        {date ? format(parseISO(date), "MMM d, yyyy") : "Set date"}
      </button>
    </div>
  );
}