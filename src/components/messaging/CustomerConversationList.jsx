import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Mail, Search, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict, parseISO, isValid, subHours } from "date-fns";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "SMS", label: "SMS" },
  { id: "Email", label: "Email" },
  { id: "unread", label: "Unread" },
  { id: "awaiting", label: "Awaiting Reply" },
];

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = parseISO(dateStr);
  if (!isValid(d)) return "";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

// Determine if a customer conversation has unread inbound messages (no subsequent outbound reply)
function computeUnread(msgs) {
  const sorted = [...msgs].sort((a, b) =>
    ((a.sent_at || a.created_date) || "").localeCompare((b.sent_at || b.created_date) || "")
  );
  return sorted.filter(m => {
    if (m.direction !== "inbound") return false;
    const inTime = parseISO(m.sent_at || m.created_date);
    if (!isValid(inTime)) return false;
    return !sorted.find(out =>
      out.direction !== "inbound" &&
      isValid(parseISO(out.sent_at || out.created_date)) &&
      parseISO(out.sent_at || out.created_date) > inTime
    );
  });
}

function CustomerRow({ conversation, isSelected, onClick }) {
  const { customer, lastMsg, unreadMsgs, lastMsgTime } = conversation;

  const isInbound = lastMsg?.direction === "inbound";
  const needsAttention = useMemo(() => {
    if (!lastMsg) return false;
    const t = parseISO(lastMsg.sent_at || lastMsg.created_date);
    if (!isValid(t)) return false;
    return isInbound && t > subHours(new Date(), 24);
  }, [lastMsg, isInbound]);

  const unreadCount = unreadMsgs.length;
  const channel = lastMsg?.channel;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 cursor-pointer",
        isSelected && "bg-primary/10 border-r-2 border-primary"
      )}
    >
      {/* Channel icon */}
      <div className="shrink-0 mt-0.5 relative">
        {channel === "Email"
          ? <Mail className="w-3.5 h-3.5 text-muted-foreground" />
          : <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
        }
        {needsAttention && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={cn(
            "text-xs font-medium truncate",
            unreadCount > 0 ? "font-semibold text-foreground" : "text-foreground/80",
            isSelected && "text-foreground"
          )}>
            {customer?.name || "Unknown Customer"}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {lastMsgTime && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(lastMsgTime)}</span>
            )}
            {unreadCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Last message preview */}
        {lastMsg && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {lastMsg.direction !== "inbound" ? "You: " : ""}{lastMsg.body}
          </p>
        )}

        {/* Job tag */}
        {lastMsg?.job_number && (
          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium truncate max-w-full">
            {lastMsg.job_number}
          </span>
        )}
      </div>
    </button>
  );
}

export default function CustomerConversationList({ selectedCustomerId, onSelect }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["commMessages-all"],
    queryFn: () => base44.entities.CommMessage.list("-created_date", 500),
    refetchInterval: 15000,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => base44.entities.Customer.list("name", 500),
    staleTime: 60000,
  });

  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach(c => { m[c.id] = c; });
    return m;
  }, [customers]);

  // Group messages by customer
  const conversations = useMemo(() => {
    const grouped = {};
    messages.forEach(msg => {
      const cid = msg.customer_id;
      if (!cid) return;
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(msg);
    });

    return Object.entries(grouped).map(([customerId, msgs]) => {
      const sorted = [...msgs].sort((a, b) =>
        ((b.sent_at || b.created_date) || "").localeCompare((a.sent_at || a.created_date) || "")
      );
      const lastMsg = sorted[0];
      const unreadMsgs = computeUnread(msgs);
      return {
        customerId,
        customer: customerMap[customerId] || { id: customerId, name: msgs[0]?.customer_name || "Unknown" },
        lastMsg,
        lastMsgTime: lastMsg?.sent_at || lastMsg?.created_date,
        unreadMsgs,
        msgs,
      };
    }).sort((a, b) => {
      // Unread float to top, then sort by recency
      if (a.unreadMsgs.length > 0 && b.unreadMsgs.length === 0) return -1;
      if (b.unreadMsgs.length > 0 && a.unreadMsgs.length === 0) return 1;
      return ((b.lastMsgTime || "") || "").localeCompare((a.lastMsgTime || "") || "");
    });
  }, [messages, customerMap]);

  // Apply filters + search
  const filtered = useMemo(() => {
    let result = conversations;

    if (activeFilter === "SMS") result = result.filter(c => c.lastMsg?.channel === "SMS");
    else if (activeFilter === "Email") result = result.filter(c => c.lastMsg?.channel === "Email");
    else if (activeFilter === "unread") result = result.filter(c => c.unreadMsgs.length > 0);
    else if (activeFilter === "awaiting") result = result.filter(c => {
      // awaiting = last message was inbound
      return c.lastMsg?.direction === "inbound";
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.customer?.name?.toLowerCase().includes(q) ||
        c.lastMsg?.body?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [conversations, activeFilter, search]);

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadMsgs.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Customers
          </p>
          {totalUnread > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-muted border-0 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors border",
                activeFilter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="text-xs text-muted-foreground px-4 py-3">Loading…</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground px-4 py-3">No conversations found.</p>
        )}
        {filtered.map(conv => (
          <CustomerRow
            key={conv.customerId}
            conversation={conv}
            isSelected={conv.customerId === selectedCustomerId}
            onClick={() => onSelect(conv)}
          />
        ))}
      </div>
    </div>
  );
}