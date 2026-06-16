import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageCircle, Loader2, Settings, CheckCheck, Briefcase } from "lucide-react";
import MessageBubble from "@/components/messaging/MessageBubble";
import MessageComposer from "@/components/messaging/MessageComposer";
import ChannelSettingsDialog from "@/components/messaging/ChannelSettingsDialog";

export default function JobMessagesTab({ job }) {
  const { user } = useAuth();
  const [replyTo, setReplyTo] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  // Use React Query for channel lookup — avoids raw useEffect API calls that cause rate limits
  const { data: channelData = [], isLoading: loadingChannel } = useQuery({
    queryKey: ["job-channel", job?.id],
    queryFn: () => base44.entities.MessageChannel.filter({ job_id: job.id }),
    enabled: !!job?.id,
    staleTime: 60000,
  });
  const channel = channelData.length > 0 ? channelData[0] : null;

  const queryKey = ["messages", channel?.id];

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.Message.filter({ channel_id: channel.id }, "created_date", 200),
    enabled: !!channel?.id,
    refetchInterval: 10000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleCreateChannel = async () => {
    const res = await base44.functions.invoke("createJobChannel", { job_id: job.id });
    if (res?.data?.channel) {
      queryClient.invalidateQueries({ queryKey: ["job-channel", job.id] });
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    }
  };

  const handleMarkRead = async () => {
    if (!channel?.id) return;
    const uid = user?.id || user?.email;
    const existing = await base44.entities.ChannelMembership.filter({
      channel_id: channel.id,
      user_id: uid,
    });
    if (existing.length > 0) {
      await base44.entities.ChannelMembership.update(existing[0].id, {
        last_read_at: new Date().toISOString(),
      });
    } else {
      await base44.entities.ChannelMembership.create({
        channel_id: channel.id,
        user_id: uid,
        user_email: user?.email,
        user_name: user?.full_name || user?.email,
        user_role: user?.role,
        last_read_at: new Date().toISOString(),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["memberships"] });
    queryClient.invalidateQueries({ queryKey: ["messages-unread"] });
  };

  if (loadingChannel) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageCircle className="w-12 h-12 mb-4 text-muted-foreground/30" />
        <h3 className="font-semibold text-sm mb-1">No job channel yet</h3>
        <p className="text-xs text-muted-foreground max-w-xs mb-4">
          A job channel is automatically created when this job is marked as "Deposit Received / Sale Won."
          You can also create one manually.
        </p>
        {["admin", "owner", "shop_manager", "estimator"].includes(user?.role) && (
          <button
            onClick={handleCreateChannel}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Create Job Channel
          </button>
        )}
      </div>
    );
  }

  const isArchived = channel?.is_archived;

  return (
    <div className="flex flex-col" style={{ height: "60vh", minHeight: "400px" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-1 py-1.5 shrink-0">
        <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium truncate flex-1">{channel.display_name}</span>
        <button
          onClick={handleMarkRead}
          className="p-1 rounded hover:bg-muted transition-colors shrink-0"
          title="Mark all as read"
          aria-label="Mark all as read"
        >
          <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1 rounded hover:bg-muted transition-colors shrink-0"
          title="Channel settings"
          aria-label="Channel settings"
        >
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border rounded-xl mb-0">
        {messagesLoading ? (
          <div className="flex justify-center py-8 text-xs text-muted-foreground">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">No messages yet — send the first one!</p>
          </div>
        ) : (
          <div className="py-2">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                currentUser={user}
                onReply={setReplyTo}
                channelId={channel.id}
                queryKey={queryKey}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {!isArchived ? (
        <MessageComposer
          channel={channel}
          currentUser={user}
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
          currentUser={user}
          onClose={() => setShowSettings(false)}
          onChannelUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["job-channel", job.id] });
            queryClient.invalidateQueries({ queryKey: ["channels"] });
          }}
        />
      )}
    </div>
  );
}