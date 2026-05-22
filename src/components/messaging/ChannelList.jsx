import React, { useState } from "react";
import { Hash, Pin, Briefcase, Search, Plus, Archive, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessChannel, formatMessageTime } from "@/lib/messagingHelpers";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function ChannelList({
  channels,
  memberships,
  selectedId,
  onSelect,
  user,
  unreadCounts,
  onNewChannel,
  showArchived,
  onToggleArchived,
}) {
  const [search, setSearch] = useState("");

  const userRole = user?.role || "user";
  const userId = user?.id || user?.email || "";

  const visible = channels.filter(c => {
    if (c.is_archived && !showArchived) return false;
    return canAccessChannel(c, userRole, userId, user?.email);
  });

  const filtered = search
    ? visible.filter(c =>
        c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c.last_message_preview?.toLowerCase().includes(search.toLowerCase())
      )
    : visible;

  const teamChannels = filtered.filter(c => c.channel_type === "team").sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const jobChannels = filtered.filter(c => c.channel_type === "job").sort((a, b) => {
    const aTime = a.last_message_at || a.created_date || "";
    const bTime = b.last_message_at || b.created_date || "";
    return bTime.localeCompare(aTime);
  });

  const canManage = ["admin", "owner", "shop_manager"].includes(userRole);

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-foreground">Messages</h2>
          {canManage && (
            <button
              onClick={onNewChannel}
              className="p-1 rounded hover:bg-muted transition-colors"
              aria-label="New channel"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search channels…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-muted border-0 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Team Channels */}
        <SectionHeader label="Team Channels" />
        {teamChannels.length === 0 && (
          <p className="text-xs text-muted-foreground px-4 py-2">No team channels</p>
        )}
        {teamChannels.map(ch => (
          <ChannelRow
            key={ch.id}
            channel={ch}
            isSelected={ch.id === selectedId}
            unread={unreadCounts[ch.id] || 0}
            onClick={() => onSelect(ch)}
          />
        ))}

        {/* Job Channels */}
        {jobChannels.length > 0 && (
          <>
            <SectionHeader label="Job Channels" className="mt-2" />
            {jobChannels.map(ch => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                isSelected={ch.id === selectedId}
                unread={unreadCounts[ch.id] || 0}
                onClick={() => onSelect(ch)}
              />
            ))}
          </>
        )}
      </div>

      {/* Archived toggle */}
      <div className="px-3 py-2 border-t shrink-0">
        <button
          onClick={onToggleArchived}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full py-1 transition-colors"
        >
          <Archive className="w-3.5 h-3.5" />
          {showArchived ? "Hide Archived" : "View Archived Channels"}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label, className }) {
  return (
    <p className={cn("px-4 pt-2 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase", className)}>
      {label}
    </p>
  );
}

function ChannelRow({ channel, isSelected, unread, onClick }) {
  const isPermanent = channel.is_permanent;
  const isArchived = channel.is_archived;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer",
        isSelected && "bg-primary/10 border-r-2 border-primary"
      )}
    >
      <div className="shrink-0 mt-0.5 relative">
        {channel.channel_type === "job" ? (
          <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {isPermanent && (
          <Pin className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 text-accent" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={cn(
            "text-xs font-medium truncate",
            isSelected ? "text-foreground" : "text-foreground/80",
            isArchived && "opacity-50"
          )}>
            {channel.display_name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {channel.last_message_at && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatMessageTime(channel.last_message_at)}
              </span>
            )}
            {unread > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
        {channel.last_message_preview && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {channel.last_message_preview}
          </p>
        )}
      </div>
    </button>
  );
}