import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Hash, Briefcase, Users, ArrowLeft, ExternalLink, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import ChannelSettingsDialog from "./ChannelSettingsDialog";
import { cn } from "@/lib/utils";

export default function MessageThread({ channel, currentUser, onBack, isMobile, onChannelUpdated }) {
  const [replyTo, setReplyTo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const queryClient = useQueryClient();

  const queryKey = ["messages", channel?.id];

  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.Message.filter({ channel_id: channel.id }, "created_date", 200),
    enabled: !!channel?.id,
    refetchInterval: 15000,
  });

  const lastMarkReadRef = useRef(0);

  // Mark read when thread opens AND periodically when new messages arrive while viewing
  useEffect(() => {
    if (!channel?.id || !currentUser) return;
    const now = Date.now();
    // Throttle: at most once every 10 seconds
    if (now - lastMarkReadRef.current < 10000) return;
    lastMarkReadRef.current = now;

    const markRead = async () => {
      const orgId = currentUser?.organization_id || channel.organization_id;
      const uid = currentUser?.id || currentUser?.email;
      const existing = await base44.entities.ChannelMembership.filter({
        channel_id: channel.id,
        user_id: uid,
        organization_id: orgId,
      });
      const nowIso = new Date().toISOString();
      if (existing.length > 0) {
        await base44.entities.ChannelMembership.update(existing[0].id, {
          last_read_at: nowIso,
        });
      } else {
        await base44.entities.ChannelMembership.create({
          organization_id: orgId,
          channel_id: channel.id,
          user_id: uid,
          user_email: currentUser?.email,
          user_name: currentUser?.full_name || currentUser?.email,
          user_role: currentUser?.role,
          last_read_at: nowIso,
        });
      }
      // Invalidate all membership + message queries so badges clear immediately everywhere
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread"] });
      queryClient.invalidateQueries({ queryKey: ["messages-sidebar-unread"] });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    };
    markRead();
  }, [channel?.id, currentUser, messages.length]);

  // Smart auto-scroll: only scroll down if user is already near the bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Load older messages
  const loadOlderMessages = async () => {
    if (loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldestDate = messages[0]?.created_date;
    const older = await base44.entities.Message.filter(
      { channel_id: channel.id, created_date: { $lt: oldestDate } },
      "-created_date",
      50
    );
    if (older.length < 50) setHasMoreMessages(false);
    if (older.length > 0) {
      queryClient.setQueryData(queryKey, [...older.reverse(), ...messages]);
    }
    setLoadingOlder(false);
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Hash className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select a channel to start messaging</p>
        </div>
      </div>
    );
  }

  const isJobChannel = channel.channel_type === "job";
  const isArchived = channel.is_archived;
  const archivingSoon = !isArchived && channel.paid_at && (() => {
    const paid = new Date(channel.paid_at);
    const archiveDate = new Date(paid.getTime() + 90 * 86400000);
    const daysLeft = Math.ceil((archiveDate - new Date()) / 86400000);
    return daysLeft <= 7 ? daysLeft : null;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-card shrink-0">
        {isMobile && (
          <button onClick={onBack} className="mr-1 p-1 rounded hover:bg-muted transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          {isJobChannel ? <Briefcase className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{channel.display_name}</h3>
            {isJobChannel && channel.job_number && (
              <Link
                to={`/jobs/${channel.job_id}`}
                className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0"
              >
                View Job → {channel.job_number}
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            {isArchived && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Archived</Badge>
            )}
          </div>
          {channel.description && (
            <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
          )}
        </div>
        {channel.member_ids?.length > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded-full">
            {channel.member_ids.length} {channel.member_ids.length === 1 ? "member" : "members"}
          </span>
        )}
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded hover:bg-muted transition-colors shrink-0"
          aria-label="Channel settings"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Archive warning banner */}
      {archivingSoon !== null && (
        <div className="px-4 py-2 bg-warning/10 border-b border-warning/20 text-xs text-warning-foreground">
          ⚠️ This channel will be archived in <strong>{archivingSoon} day{archivingSoon !== 1 ? "s" : ""}</strong>.
          {channel.paid_at && ` Job was completed and paid on ${format(parseISO(channel.paid_at), "MMM d, yyyy")}.`}
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-2">
        {/* Load older messages button */}
        {!isLoading && hasMoreMessages && messages.length > 0 && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded-full bg-muted/60 hover:bg-muted transition-colors disabled:opacity-50"
            >
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-12 text-xs text-muted-foreground">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Hash className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Be the first to send a message in #{channel.display_name}</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currentUser={currentUser}
              onReply={setReplyTo}
              channelId={channel.id}
              queryKey={queryKey}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {!isArchived ? (
        <MessageComposer
          channel={channel}
          currentUser={currentUser}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSent={() => queryClient.invalidateQueries({ queryKey })}
        />
      ) : (
        <div className="border-t px-4 py-3 text-center text-xs text-muted-foreground bg-muted/30">
          This channel is archived. Messages are read-only.
        </div>
      )}

      {showSettings && (
        <ChannelSettingsDialog
          channel={channel}
          currentUser={currentUser}
          onClose={() => setShowSettings(false)}
          onChannelUpdated={onChannelUpdated}
        />
      )}
    </div>
  );
}