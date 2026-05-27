import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, RefreshCw, AlertCircle } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "sonner";
import { useAssignedSmsNumber, formatPhone } from "@/lib/useAssignedSmsNumber";

function JobTagPill({ jobNumber, jobName }) {
  if (!jobNumber) return null;
  return (
    <div className="flex justify-end mb-1">
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
        {jobNumber}{jobName ? ` — ${jobName}` : ""}
      </span>
    </div>
  );
}

function DeliveryStatus({ status }) {
  if (status === "delivered") return <span className="text-[10px] text-muted-foreground">Delivered</span>;
  if (status === "sent") return <span className="text-[10px] text-muted-foreground">Sent</span>;
  if (status === "failed") return <span className="text-[10px] text-red-500">Failed</span>;
  return null;
}

function MessageBubble({ msg, customerName }) {
  const isInbound = msg.direction === "inbound";
  const time = msg.sent_at || msg.created_date;

  return (
    <div className={`flex flex-col ${isInbound ? "items-start" : "items-end"} mb-3`}>
      {/* Job tag above outbound messages */}
      {!isInbound && msg.job_number && (
        <JobTagPill jobNumber={msg.job_number} jobName={msg.job_name} />
      )}

      <div className={`max-w-[75%] ${isInbound ? "" : ""}`}>
        {/* Sender name */}
        <p className={`text-[10px] text-muted-foreground mb-1 ${isInbound ? "pl-1" : "pr-1 text-right"}`}>
          {isInbound ? (customerName || msg.from_name || "Customer") : (msg.from_name || "Your Team")}
        </p>

        {/* Bubble */}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isInbound
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        }`}>
          {msg.body}
        </div>

        {/* Time + delivery status */}
        <div className={`flex items-center gap-1.5 mt-1 ${isInbound ? "pl-1" : "pr-1 justify-end"}`}>
          {time && isValid(parseISO(time)) && (
            <span className="text-[10px] text-muted-foreground">
              {format(parseISO(time), "MMM d, h:mm a")}
            </span>
          )}
          {!isInbound && <DeliveryStatus status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

export default function CustomerSMSThread({ customer, jobFilter = null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const bottomRef = useRef(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const { data: appSettings } = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => base44.functions.invoke("getAppSettings", {}).then(r => r.data),
    staleTime: 60000,
  });

  const { myEmployee, myAssignedNumber, mainNumber } = useAssignedSmsNumber(user?.email, true);

  const effectiveFromPhone = myAssignedNumber
    || mainNumber?.phone_number
    || appSettings?.twilio_from_number
    || "";
  const effectiveFromName = myEmployee?.preferred_name || myEmployee?.name || user?.full_name || "High Country Metal Works";
  const usingMainFallback = !myAssignedNumber;

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["commMessages", "sms", customer?.id],
    queryFn: () => base44.entities.CommMessage.filter({ customer_id: customer.id, channel: "SMS" }),
    enabled: !!customer?.id,
    refetchInterval: 15000,
  });

  const sorted = [...messages].sort((a, b) =>
    ((a.sent_at || a.created_date) || "").localeCompare((b.sent_at || b.created_date) || "")
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted.length]);

  async function handleSend() {
    if (!replyText.trim()) return;
    if (!customer?.phone) { toast.error("Customer has no phone number on file"); return; }

    setSending(true);

    // Create record
    const msgRecord = await base44.entities.CommMessage.create({
      customer_id: customer.id,
      customer_name: customer.name,
      channel: "SMS",
      direction: "outbound",
      status: "sent",
      to_name: customer.name,
      to_phone: customer.phone,
      from_name: effectiveFromName,
      from_phone: effectiveFromPhone,
      body: replyText,
      sent_at: new Date().toISOString(),
    });

    // Fire send
    const resp = await base44.functions.invoke("sendCustomerMessage", {
      message_id: msgRecord.id,
      channel: "SMS",
      to_phone: customer.phone,
      from_phone: effectiveFromPhone,
      message_body: replyText,
    });

    if (resp.data?.ok) {
      setReplyText("");
      toast.success("SMS sent!");
      qc.invalidateQueries({ queryKey: ["commMessages", "sms", customer.id] });
    } else {
      toast.error("Send failed: " + (resp.data?.error || "Unknown error"));
    }
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!customer?.phone) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">No phone number on file for this customer.</p>
        <p className="text-xs mt-1">Add a phone number to the customer profile to enable SMS.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Thread header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20 shrink-0">
        <div>
          <p className="text-sm font-semibold">{customer.name}</p>
          <p className="text-xs text-muted-foreground">{customer.phone}</p>
        </div>
        <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading messages…</p>
        )}
        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No SMS history yet.</p>
            <p className="text-xs mt-1">Send a message below to start the conversation.</p>
          </div>
        )}
        {sorted.map(msg => (
          <MessageBubble key={msg.id} msg={msg} customerName={customer.name} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div className="px-4 py-3 border-t bg-background shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none min-h-[44px] max-h-[120px] p-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring bg-background leading-relaxed"
            placeholder="Type a message… (Enter to send)"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !replyText.trim()}
            className="h-[44px] w-[44px] p-0 rounded-xl shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] ${usingMainFallback ? "text-amber-600" : "text-muted-foreground"}`}>
          {usingMainFallback && <AlertCircle className="w-3 h-3" />}
          <span>
            Sending from: {formatPhone(effectiveFromPhone) || "—"}
            {usingMainFallback ? " — Main Business Number" : ` — ${effectiveFromName}`}
          </span>
          {usingMainFallback && (
            <a href="/settings" className="underline ml-1">Assign a number</a>
          )}
        </div>
      </div>
    </div>
  );
}