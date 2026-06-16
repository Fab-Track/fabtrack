import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import usePullToRefresh from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { canAccessChannel } from "@/lib/messagingHelpers";
import ChannelList from "@/components/messaging/ChannelList";
import MessageThread from "@/components/messaging/MessageThread";
import NewMessageDialog from "@/components/messaging/NewMessageDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Messages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [mobileView, setMobileView] = useState("list"); // "list" | "thread"
  const [showArchived, setShowArchived] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);

  // Ensure permanent channels exist on load
  useEffect(() => {
    base44.functions.invoke("ensurePermanentChannels", {}).catch(() => {});
  }, []);

  const { data: channels = [], isLoading, refetch: refetchChannels } = useQuery({
    queryKey: ["channels"],
    queryFn: () => base44.entities.MessageChannel.list("sort_order", 200),
    refetchInterval: 15000,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships", user?.id],
    queryFn: () => base44.entities.ChannelMembership.filter({
      user_id: user?.id || user?.email,
    }),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ["messages-unread"],
    queryFn: () => base44.entities.Message.list("-created_date", 500),
    refetchInterval: 15000,
  });

  // Compute unread counts per channel
  const unreadCounts = {};
  const userRole = user?.role || "user";
  const userId = user?.id || user?.email || "";

  channels.forEach(ch => {
    if (!canAccessChannel(ch, userRole, userId, user?.email)) return;
    const membership = memberships.find(m => m.channel_id === ch.id);
    const lastRead = membership?.last_read_at ? new Date(membership.last_read_at) : new Date(0);
    const unread = allMessages.filter(m =>
      m.channel_id === ch.id && new Date(m.created_date) > lastRead && m.sender_id !== userId
    ).length;
    if (unread > 0) unreadCounts[ch.id] = unread;
  });

  const { containerRef: pullRef, isPulling, pullDistance } = usePullToRefresh({
    onRefresh: () => qc.invalidateQueries({ queryKey: ["channels"] }),
    enabled: mobileView === "list",
  });

  const handleSelectChannel = (ch) => {
    setSelectedChannel(ch);
    setMobileView("thread");
  };

  async function markAllRead() {
    const now = new Date().toISOString();
    const promises = memberships.map(m =>
      base44.entities.ChannelMembership.update(m.id, { last_read_at: now })
    );
    await Promise.all(promises);
    qc.invalidateQueries({ queryKey: ["memberships"] });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-8 w-40" />
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex overflow-hidden">
      {/* Left panel — channel list */}
      <div ref={pullRef} className={`
        ${mobileView === "thread" ? "hidden" : "flex"} md:flex
        w-full md:w-72 lg:w-80 flex-col shrink-0
        border-r bg-card relative
      `}>
        <PullToRefreshIndicator pullDistance={pullDistance} isPulling={isPulling} />
        <ChannelList
          channels={channels}
          memberships={memberships}
          selectedId={selectedChannel?.id}
          onSelect={handleSelectChannel}
          user={user}
          unreadCounts={unreadCounts}
          onNewChannel={() => setShowNewChannel(true)}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived(v => !v)}
          onMarkAllRead={markAllRead}
        />
      </div>

      {/* Right panel — message thread */}
      <div className={`
        ${mobileView === "list" ? "hidden" : "flex"} md:flex
        flex-1 flex-col overflow-hidden
      `}>
        <MessageThread
          channel={selectedChannel}
          currentUser={user}
          onBack={() => setMobileView("list")}
          isMobile={mobileView === "thread"}
        />
      </div>

      {showNewChannel && (
        <NewMessageDialog
          onClose={() => setShowNewChannel(false)}
          onCreated={handleSelectChannel}
          currentUser={user}
        />
      )}
    </div>
  );
}