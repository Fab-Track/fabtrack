import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mail, ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const STATUS_CONFIG = {
  queued:    { label: "Queued",    icon: Clock,         color: "bg-slate-100 text-slate-600" },
  draft:     { label: "Draft",     icon: FileText,      color: "bg-slate-100 text-slate-500" },
  scheduled: { label: "Scheduled", icon: Clock,         color: "bg-blue-100 text-blue-700" },
  sent:      { label: "Sent",      icon: CheckCircle2,  color: "bg-green-100 text-green-700" },
  delivered: { label: "Delivered", icon: CheckCircle2,  color: "bg-emerald-100 text-emerald-700" },
  failed:    { label: "Failed",    icon: XCircle,       color: "bg-red-100 text-red-700" },
  dismissed: { label: "Dismissed", icon: AlertTriangle, color: "bg-slate-100 text-slate-500" },
};

import { FileText } from "lucide-react";

function CommRow({ msg }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.sent;
  const Icon = cfg.icon;
  const sentAt = msg.sent_at || msg.created_date;

  return (
    <div className="border-b last:border-0 px-4 py-3 hover:bg-muted/20">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-md ${msg.channel === "SMS" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
          {msg.channel === "SMS" ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{msg.to_name || "Customer"}</span>
            {msg.template_name && (
              <Badge variant="outline" className="text-[10px] px-1.5">{msg.template_name}</Badge>
            )}
            <Badge className={`text-[10px] px-1.5 ${cfg.color}`}>
              <Icon className="w-2.5 h-2.5 mr-1 inline" />{cfg.label}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {sentAt && isValid(parseISO(sentAt)) ? format(parseISO(sentAt), "MMM d, h:mm a") : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium">{msg.from_name}</span>
            {msg.subject && <span> · {msg.subject}</span>}
          </p>
          <p className={`text-sm mt-1 text-foreground/80 ${expanded ? "whitespace-pre-wrap" : "truncate"}`}>
            {msg.body}
          </p>
          {msg.error_message && (
            <p className="text-xs text-destructive mt-1">Error: {msg.error_message}</p>
          )}
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function CommHistoryList({ jobId, customerId }) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["commMessages", jobId, customerId],
    queryFn: async () => {
      if (jobId) return base44.entities.CommMessage.filter({ job_id: jobId });
      if (customerId) return base44.entities.CommMessage.filter({ customer_id: customerId });
      return [];
    },
    enabled: !!(jobId || customerId),
    refetchInterval: 30000,
  });

  const sorted = [...messages].sort((a, b) =>
    ((b.sent_at || b.created_date) || "").localeCompare((a.sent_at || a.created_date) || "")
  );

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;
  if (sorted.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">No messages sent yet.</p>
    </div>
  );

  return (
    <div className="divide-y">
      {sorted.map(msg => <CommRow key={msg.id} msg={msg} />)}
    </div>
  );
}