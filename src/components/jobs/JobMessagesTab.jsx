import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageCircle, Loader2 } from "lucide-react";
import MessageBubble from "@/components/messaging/MessageBubble";
import MessageComposer from "@/components/messaging/MessageComposer";
import { PERMANENT_CHANNELS } from "@/lib/messagingHelpers";

export default function JobMessagesTab({ job }) {
  const { user } = useAuth();
  const [channel, setChannel] = useState(null);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const queryKey = ["messages", channel?.id];

  // Find or create job channel
  useEffect(() => {
    if (!job?.id) return;
    const findChannel = async () => {
      setLoadingChannel(true);
      const existing = await base44.entities.MessageChannel.filter({ job_id: job.id });
      if (existing.length > 0) {
        setChannel(existing[0]);
      } else {
        setChannel(null);
      }
      setLoadingChannel(false);
    };
    findChannel();
  }, [job?.id]);

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.Message.filter({ channel_id: channel.id }, "created_date", 200),
    enabled: !!channel?.id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleCreateChannel = async () => {
    setLoadingChannel(true);
    const res = await base44.functions.invoke("createJobChannel", { job_id: job.id });
    if (res?.data?.channel) {
      setChannel(res.data.channel);
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    }
    setLoadingChannel(false);
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

  return (
    <div className="flex flex-col" style={{ height: "60vh", minHeight: "400px" }}>
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

      <MessageComposer
        channel={channel}
        currentUser={user}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSent={() => queryClient.invalidateQueries({ queryKey })}
      />
    </div>
  );
}