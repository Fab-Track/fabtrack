import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export default function CorrectionRequestModal({ open, onClose, employee, dayEntries, dateStr }) {
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () => {
      const entryId = dayEntries.length === 1 ? dayEntries[0].id : null;
      return base44.entities.CorrectionRequest.create({
        employee_id: employee.id,
        employee_name: employee.name,
        time_entry_id: entryId,
        date: dateStr,
        description: description.trim(),
        requested_action: description.trim(),
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["correctionRequests", employee.id] });
      queryClient.invalidateQueries({ queryKey: ["correctionRequests"] });
      toast.success("Correction request submitted for manager review.");
      setDescription("");
      onClose();
    },
  });

  if (!dayEntries || dayEntries.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Request Correction
          </DialogTitle>
          <DialogDescription>
            {dateStr ? format(parseISO(dateStr), "EEEE, MMMM d, yyyy") : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-muted-foreground">Current entries for this day:</p>
            {dayEntries.map(e => (
              <div key={e.id} className="flex justify-between font-mono">
                <span>
                  {e.clock_in ? format(parseISO(e.clock_in), "h:mm a") : "—"} →{" "}
                  {e.clock_out ? format(parseISO(e.clock_out), "h:mm a") : "no clock-out"}
                </span>
                <span className="text-muted-foreground">
                  {e.work_center || ""} {e.break_minutes > 0 ? `· ${Math.round(e.break_minutes)}m break` : ""}
                </span>
              </div>
            ))}
          </div>

          <Textarea
            placeholder="Describe what needs to be corrected... (e.g. 'Forgot to clock out, left at 4:30 PM' or 'My lunch break should be 30 minutes, not 45')"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="h-28"
          />

          <p className="text-xs text-muted-foreground">
            Your manager will review this request and update your time entry if needed. You'll see the status here.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={!description.trim() || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}