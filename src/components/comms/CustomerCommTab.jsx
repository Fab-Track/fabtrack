import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, Send, AlertCircle } from "lucide-react";
import { format, parseISO, isValid, differenceInMinutes } from "date-fns";
import CustomerSMSThread from "./CustomerSMSThread";
import CommHistoryList from "./CommHistoryList";
import MessageComposerModal from "./MessageComposerModal";

// ── Summary header ────────────────────────────────────────────────────────────
function CommSummaryHeader({ messages, onCompose }) {
  const sent = messages.filter(m => m.direction !== "inbound");
  const inbound = messages.filter(m => m.direction === "inbound");

  const lastMsg = [...messages].sort((a, b) =>
    ((b.sent_at || b.created_date) || "").localeCompare((a.sent_at || a.created_date) || "")
  )[0];

  // Avg response time: for each inbound, find the next outbound after it
  const sortedAll = [...messages].sort((a, b) =>
    ((a.sent_at || a.created_date) || "").localeCompare((b.sent_at || b.created_date) || "")
  );
  const responseTimes = [];
  inbound.forEach(inMsg => {
    const inTime = parseISO(inMsg.sent_at || inMsg.created_date);
    if (!isValid(inTime)) return;
    const nextOut = sortedAll.find(m =>
      m.direction !== "inbound" &&
      isValid(parseISO(m.sent_at || m.created_date)) &&
      parseISO(m.sent_at || m.created_date) > inTime
    );
    if (nextOut) {
      responseTimes.push(differenceInMinutes(
        parseISO(nextOut.sent_at || nextOut.created_date), inTime
      ));
    }
  });
  const avgResponse = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  const formatAvgResponse = (mins) => {
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.round(mins / 60)}h`;
    return `${Math.round(mins / 1440)}d`;
  };

  const lastContactDate = lastMsg
    ? (lastMsg.sent_at || lastMsg.created_date)
    : null;

  // Unread = inbound messages without a subsequent outbound reply
  const unread = inbound.filter(inMsg => {
    const inTime = parseISO(inMsg.sent_at || inMsg.created_date);
    if (!isValid(inTime)) return false;
    return !sortedAll.find(m =>
      m.direction !== "inbound" &&
      isValid(parseISO(m.sent_at || m.created_date)) &&
      parseISO(m.sent_at || m.created_date) > inTime
    );
  });

  return (
    <div className="px-4 pt-4 pb-3 border-b bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Communication Summary</h3>
        <Button size="sm" onClick={onCompose} className="h-7 text-xs gap-1.5">
          <Send className="w-3 h-3" /> Compose
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Messages Sent</p>
          <p className="text-lg font-bold mt-0.5">{sent.length}</p>
        </div>
        <div className="bg-card rounded-lg border px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Contact</p>
          <p className="text-sm font-semibold mt-0.5 truncate">
            {lastContactDate && isValid(parseISO(lastContactDate))
              ? format(parseISO(lastContactDate), "MMM d")
              : "—"}
          </p>
        </div>
        <div className="bg-card rounded-lg border px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Awaiting Reply</p>
          <p className={`text-lg font-bold mt-0.5 ${unread.length > 0 ? "text-orange-500" : ""}`}>
            {unread.length > 0 ? (
              <span className="flex items-center gap-1">
                {unread.length} <AlertCircle className="w-3.5 h-3.5" />
              </span>
            ) : "0"}
          </p>
        </div>
        <div className="bg-card rounded-lg border px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Response</p>
          <p className="text-sm font-semibold mt-0.5">
            {avgResponse !== null ? formatAvgResponse(avgResponse) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Email history (flat list for now, grouped by thread) ───────────────────────
function EmailHistoryView({ customerId }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <CommHistoryList customerId={customerId} channelFilter="Email" />
    </div>
  );
}

// ── All channel view ───────────────────────────────────────────────────────────
function AllChannelView({ customerId }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <CommHistoryList customerId={customerId} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerCommTab({ customer }) {
  const [activeChannel, setActiveChannel] = useState("SMS");
  const [composerOpen, setComposerOpen] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ["commMessages", customer?.id],
    queryFn: () => base44.entities.CommMessage.filter({ customer_id: customer.id }),
    enabled: !!customer?.id,
    refetchInterval: 15000,
  });

  const CHANNELS = [
    { id: "SMS", label: "SMS", icon: MessageSquare },
    { id: "Email", label: "Email", icon: Mail },
    { id: "All", label: "All", icon: null },
  ];

  return (
    <div className="flex flex-col min-h-[500px]">
      {/* Summary header */}
      <CommSummaryHeader messages={messages} onCompose={() => setComposerOpen(true)} />

      {/* Channel tab switcher */}
      <div className="flex gap-0 border-b shrink-0">
        {CHANNELS.map(ch => {
          const Icon = ch.icon;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeChannel === ch.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {ch.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeChannel === "SMS" && (
          <CustomerSMSThread customer={customer} />
        )}
        {activeChannel === "Email" && (
          <EmailHistoryView customerId={customer.id} />
        )}
        {activeChannel === "All" && (
          <AllChannelView customerId={customer.id} />
        )}
      </div>

      <MessageComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        customer={customer}
        onSent={() => {}}
      />
    </div>
  );
}