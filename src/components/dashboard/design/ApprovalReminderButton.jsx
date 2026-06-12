import React, { useState } from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const REMINDER_KEY = (jobId) => `design_approval_reminder_${jobId}`;

function getLastReminder(jobId) {
  try {
    const val = localStorage.getItem(REMINDER_KEY(jobId));
    return val ? new Date(val) : null;
  } catch { return null; }
}

function persistLastReminder(jobId, date) {
  localStorage.setItem(REMINDER_KEY(jobId), date.toISOString());
}

export default function ApprovalReminderButton({ job }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(() => getLastReminder(job.id));

  const handleSend = async () => {
    setSending(true);
    try {
      const recipientEmail = job.lead_customer_email || null;
      const recipientName = job.customer_name || "the customer";
      const body = `Hi ${recipientName},\n\nThis is a friendly reminder that the drawing for job ${job.job_number} — "${job.job_name}" is currently awaiting your approval. Please review and approve the drawing at your earliest convenience so we can proceed with fabrication.\n\nThank you!`;

      if (recipientEmail) {
        await base44.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: `Drawing Approval Needed — ${job.job_number}: ${job.job_name}`,
          body,
        });
      }

      const now = new Date();
      persistLastReminder(job.id, now);
      setLastSent(now);
      toast({
        title: "Approval reminder sent!",
        description: recipientEmail ? `Sent to ${recipientEmail}` : "Reminder logged (no customer email on file).",
      });
    } catch (e) {
      toast({ title: "Failed to send reminder", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  // Prevent duplicate sends within 30 minutes
  const tooRecent = lastSent && (new Date() - lastSent) < 30 * 60 * 1000;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={tooRecent ? "outline" : "default"}
        disabled={sending || tooRecent}
        onClick={handleSend}
        className="text-xs h-7 px-2.5 shrink-0"
      >
        {sending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : tooRecent ? (
          <><CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />Sent</>
        ) : (
          <><Bell className="w-3 h-3 mr-1" />Send Reminder</>
        )}
      </Button>
      {lastSent && (
        <span className="text-[10px] text-muted-foreground">
          Last: {format(lastSent, "MMM d, h:mma")}
        </span>
      )}
    </div>
  );
}