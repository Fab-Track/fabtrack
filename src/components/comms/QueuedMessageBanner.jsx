import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MessageSquare, X, Send, Clock, AlertTriangle } from "lucide-react";
import { differenceInHours, parseISO } from "date-fns";
import MessageComposerModal from "./MessageComposerModal";
import { toast } from "sonner";

export default function QueuedMessageBanner({ job, customer }) {
  const qc = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [activeMsg, setActiveMsg] = useState(null);

  const { data: queued = [] } = useQuery({
    queryKey: ["commMessages", job?.id],
    queryFn: () => base44.entities.CommMessage.filter({ job_id: job.id, status: "queued" }),
    enabled: !!job?.id,
    refetchInterval: 60000,
  });

  if (!queued.length) return null;

  const msg = queued[0];
  const hoursOld = msg.queued_at ? differenceInHours(new Date(), parseISO(msg.queued_at)) : 0;
  const isStale = hoursOld >= 48;
  const firstName = (customer?.name || job?.customer_name || "").split(" ")[0] || "Customer";

  async function dismiss() {
    await base44.entities.CommMessage.update(msg.id, { status: "dismissed" });
    qc.invalidateQueries({ queryKey: ["commMessages", job?.id] });
    toast.info("Message dismissed");
  }

  function openComposer() {
    setActiveMsg(msg);
    setComposerOpen(true);
  }

  return (
    <>
      <div className={`rounded-xl border px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 ${isStale ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}`}>
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {isStale
            ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            : <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          }
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              📨 Message ready to send to {firstName}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              <span className="font-medium">{msg.template_name || "Message"}</span> · {msg.body?.slice(0, 80)}{msg.body?.length > 80 ? "…" : ""}
            </p>
            {isStale && (
              <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Queued {hoursOld}h ago — follow up?
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" onClick={openComposer} className="gap-1.5 h-7 text-xs">
            <Send className="w-3 h-3" /> Send Now
          </Button>
          <Button size="sm" variant="outline" onClick={openComposer} className="h-7 text-xs">
            Edit & Send
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} className="h-7 text-xs px-2">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {queued.length > 1 && (
        <p className="text-xs text-muted-foreground mb-4 ml-1">
          +{queued.length - 1} more queued message{queued.length > 2 ? "s" : ""}
        </p>
      )}

      <MessageComposerModal
        open={composerOpen}
        onClose={() => { setComposerOpen(false); setActiveMsg(null); }}
        job={job}
        customer={customer}
        prefillMessage={activeMsg}
        onSent={async () => {
          if (activeMsg) {
            await base44.entities.CommMessage.update(activeMsg.id, { status: "sent" });
          }
          qc.invalidateQueries({ queryKey: ["commMessages", job?.id] });
        }}
      />
    </>
  );
}