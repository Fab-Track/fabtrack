import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import CommHistoryList from "@/components/comms/CommHistoryList";
import MessageComposerModal from "@/components/comms/MessageComposerModal";
import QueuedMessageBanner from "@/components/comms/QueuedMessageBanner";
import { useAuth } from "@/lib/AuthContext";
import { useEffectiveRole } from "@/lib/PreviewRoleContext";

const READ_ONLY_ROLES = ["fabricator", "design_specialist", "installer", "grinder", "cutter", "fitter", "welder"];

export default function JobCommunicationsTab({ job, customer }) {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole(user?.role || "admin");
  const isReadOnly = READ_ONLY_ROLES.includes(effectiveRole.toLowerCase());
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Queued banner */}
      {!isReadOnly && <QueuedMessageBanner job={job} customer={customer} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Customer Communications</h3>
          <p className="text-xs text-muted-foreground mt-0.5">All messages sent to {job.customer_name} for this job</p>
        </div>
        {!isReadOnly && (
          <Button size="sm" onClick={() => setComposerOpen(true)} className="gap-1.5">
            <Send className="w-3.5 h-3.5" /> Send Message
          </Button>
        )}
      </div>

      {/* History */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <CommHistoryList jobId={job.id} />
      </div>

      <MessageComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        job={job}
        customer={customer}
      />
    </div>
  );
}