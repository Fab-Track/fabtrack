import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import usePullToRefresh from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { canAccessChannel } from "@/lib/messagingHelpers";
import { useOrgFilter } from "@/lib/orgContext";
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

  const orgFilter = useOrgFilter();

  const { data: channels = [], isLoading, refetch: refetchChannels } = useQuery({
    queryKey: ["channels", orgFilter],
    queryFn: () => base44.entities.MessageChannel.filter(orgFilter, "sort_order", 200),
    refetchInterval: 5000,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["memberships", user?.id, orgFilter, user?.organization_id],
    queryFn: () => base44.entities.ChannelMembership.filter({
      ...orgFilter,
      user_id: user?.id || user?.email,
    }),
    enabled: !!user,
    refetchInterval: 5000, // Faster refresh for real-time unread badges
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ["messages-unread", orgFilter],
    queryFn: () => base44.entities.Message.filter(orgFilter, "-created_date", 500),
    refetchInterval: 5000,
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

  const handleMarkRead = async (channelId) => {
    const uid = user?.id || user?.email;
    const orgId = user?.organization_id;
    if (!uid || !orgId) return;
    const existing = await base44.entities.ChannelMembership.filter({
      channel_id: channelId,
      user_id: uid,
      organization_id: orgId,
    });
    const now = new Date().toISOString();
    if (existing.length > 0) {
      await base44.entities.ChannelMembership.update(existing[0].id, {
        last_read_at: now,
      });
    } else {
      await base44.entities.ChannelMembership.create({
        organization_id: orgId,
        channel_id: channelId,
        user_id: uid,
        user_email: user?.email,
        user_name: user?.full_name || user?.email,
        user_role: user?.role,
        last_read_at: now,
      });
    }
    qc.invalidateQueries({ queryKey: ["memberships"] });
    qc.invalidateQueries({ queryKey: ["messages-unread"] });
    qc.invalidateQueries({ queryKey: ["messages-sidebar-unread"] });
    qc.invalidateQueries({ queryKey: ["channels"] });
  };

  const handleChannelUpdated = () => {
    refetchChannels();
    // Clear selection so the thread reloads with fresh data
    setSelectedChannel(prev => prev ? { ...prev } : null);
  };

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
          onMarkRead={handleMarkRead}
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
          onChannelUpdated={handleChannelUpdated}
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