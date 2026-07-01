import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Lock, Globe, Users, UserPlus, X, Search, Loader2 } from "lucide-react";
import { canManageChannel } from "@/lib/messagingHelpers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChannelMembersSection({ channel: initialChannel, currentUser, onChannelUpdated }) {
  const [channel, setChannel] = useState(initialChannel);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [toggling, setToggling] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const qc = useQueryClient();

  const canManage = canManageChannel(currentUser);
  const isPrivate = channel?.visibility === "private";
  const currentUserId = currentUser?.id || currentUser?.email;
  const orgId = currentUser?.organization_id || channel?.organization_id;

  // Fetch ChannelMembership records for this channel (for member names)
  const { data: memberships = [] } = useQuery({
    queryKey: ["channel-members", channel?.id],
    queryFn: () => base44.entities.ChannelMembership.filter({ channel_id: channel?.id }, undefined, 500),
    enabled: !!channel?.id,
  });

  // Fetch org users for the member picker
  const { data: orgUsers = [] } = useQuery({
    queryKey: ["org-users-members"],
    queryFn: async () => {
      try {
        const userList = await base44.entities.User.list();
        if (userList.length > 0) return userList;
      } catch {}
      const employees = await base44.entities.Employee.list("-created_date", 200);
      return employees.map(e => ({
        id: e.id,
        full_name: e.name,
        email: e.email || "",
        role: e.role || "team_member",
      }));
    },
    enabled: showAddMember && canManage,
  });

  const currentMemberIds = channel?.member_ids || [];
  const currentMembers = memberships.filter(m => currentMemberIds.includes(m.user_id));
  const otherMembers = currentMembers.filter(m => m.user_id !== currentUserId);
  const isCurrentUserMember = currentMemberIds.includes(currentUserId);

  const availableUsers = orgUsers.filter(u => {
    const uid = u.id || u._id;
    if (currentMemberIds.includes(uid)) return false;
    if (uid === currentUserId) return false;
    const search = memberSearch.toLowerCase();
    if (!search) return true;
    return u.full_name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search);
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["channel-members", channel?.id] });
    qc.invalidateQueries({ queryKey: ["channels"] });
    qc.invalidateQueries({ queryKey: ["memberships"] });
    qc.invalidateQueries({ queryKey: ["messages-unread"] });
  };

  const handleAddMember = async (user) => {
    const uid = user.id || user._id;
    setAddingId(uid);
    try {
      const newMemberIds = [...currentMemberIds, uid];
      await base44.entities.MessageChannel.update(channel.id, { member_ids: newMemberIds });
      setChannel(prev => ({ ...prev, member_ids: newMemberIds }));
      try {
        await base44.entities.ChannelMembership.create({
          organization_id: orgId,
          channel_id: channel.id,
          user_id: uid,
          user_email: user.email || "",
          user_name: user.full_name || user.email || "",
          user_role: user.role || "",
        });
      } catch {}
      invalidateAll();
      onChannelUpdated?.();
      toast.success(`Added ${user.full_name || user.email}`);
    } catch (err) {
      toast.error(err?.message || "Failed to add member");
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveMember = async (membership) => {
    const uid = membership.user_id;
    setRemovingId(uid);
    try {
      const newMemberIds = currentMemberIds.filter(id => id !== uid);
      await base44.entities.MessageChannel.update(channel.id, { member_ids: newMemberIds });
      setChannel(prev => ({ ...prev, member_ids: newMemberIds }));
      try {
        await base44.entities.ChannelMembership.delete(membership.id);
      } catch {}
      invalidateAll();
      onChannelUpdated?.();
      toast.success(`Removed ${membership.user_name || membership.user_email}`);
    } catch (err) {
      toast.error(err?.message || "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggleVisibility = async () => {
    if (toggling) return;

    if (!isPrivate) {
      // Public → Private: auto-include current user as first member
      setToggling(true);
      try {
        const newMemberIds = [currentUserId];
        await base44.entities.MessageChannel.update(channel.id, {
          visibility: "private",
          member_ids: newMemberIds,
        });
        setChannel(prev => ({ ...prev, visibility: "private", member_ids: newMemberIds }));
        try {
          await base44.entities.ChannelMembership.create({
            organization_id: orgId,
            channel_id: channel.id,
            user_id: currentUserId,
            user_email: currentUser?.email || "",
            user_name: currentUser?.full_name || currentUser?.email || "",
            user_role: currentUser?.role || "",
          });
        } catch {}
        invalidateAll();
        onChannelUpdated?.();
        setShowAddMember(true);
        toast.success("Channel is now private. Add members below.");
      } catch (err) {
        toast.error(err?.message || "Failed to change visibility");
      } finally {
        setToggling(false);
      }
    } else {
      // Private → Public: clear member list
      setToggling(true);
      try {
        await base44.entities.MessageChannel.update(channel.id, {
          visibility: "public",
          member_ids: [],
        });
        setChannel(prev => ({ ...prev, visibility: "public", member_ids: [] }));
        invalidateAll();
        onChannelUpdated?.();
        toast.success("Channel is now public — everyone in the org has access.");
      } catch (err) {
        toast.error(err?.message || "Failed to change visibility");
      } finally {
        setToggling(false);
      }
    }
  };

  const memberCount = currentMemberIds.length;

  return (
    <div className="space-y-3">
      {/* Visibility badge + toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isPrivate ? (
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">{isPrivate ? "Private" : "Public"}</p>
            <p className="text-xs text-muted-foreground">
              {isPrivate
                ? "Invite-only — only members can see this channel"
                : "Open to everyone in your organization"}
            </p>
          </div>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleVisibility}
            disabled={toggling}
            className="shrink-0"
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPrivate ? (
              "Make Public"
            ) : (
              "Make Private"
            )}
          </Button>
        )}
      </div>

      <Separator />

      {isPrivate ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Members ({memberCount})
            </Label>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAddMember(v => !v)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add
              </Button>
            )}
          </div>

          {/* Member list */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {isCurrentUserMember && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                  {currentUser?.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {currentUser?.full_name || currentUser?.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground">You</p>
                </div>
              </div>
            )}
            {otherMembers.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                  {m.user_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {m.user_name || m.user_email}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {m.user_email}
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemoveMember(m)}
                    disabled={removingId === m.user_id}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Remove member"
                  >
                    {removingId === m.user_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}
            {!isCurrentUserMember && otherMembers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No members yet
              </p>
            )}
          </div>

          {/* Add member picker */}
          {showAddMember && canManage && (
            <div className="space-y-2 mt-2 p-2 rounded-md border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search team members…"
                  className="pl-8 h-8 text-xs"
                  autoFocus
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {availableUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No users found
                  </p>
                )}
                {availableUsers.map(u => (
                  <button
                    key={u.id || u._id}
                    onClick={() => handleAddMember(u)}
                    disabled={addingId === (u.id || u._id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-left transition-colors disabled:opacity-50"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                      {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{u.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {u.email}
                      </p>
                    </div>
                    {addingId === (u.id || u._id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/40">
          <Users className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            This channel is public — everyone in your organization can see and
            post messages. No membership list to manage.
          </p>
        </div>
      )}
    </div>
  );
}