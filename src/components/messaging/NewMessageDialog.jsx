import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MessageCircle, Hash, Lock, Globe, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function NewMessageDialog({ onClose, onCreated, currentUser }) {
  const canCreateChannel = ["admin", "owner", "shop_manager"].includes(currentUser?.role);
  const [tab, setTab] = useState("dm");
  const [dmSearch, setDmSearch] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [channelVisibility, setChannelVisibility] = useState("public");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-dm"],
    queryFn: async () => {
      try {
        const userList = await base44.entities.User.list();
        if (userList.length > 1) return userList;
      } catch {}
      const employees = await base44.entities.Employee.list("-created_date", 200);
      return employees.map(e => ({
        id: e.id,
        full_name: e.name,
        email: e.email || "",
        role: e.role || "team_member",
        organization_id: e.organization_id,
      }));
    },
    enabled: tab === "dm" || (tab === "channel" && channelVisibility === "private"),
  });

  const otherUsers = users.filter(u => {
    const uid = u.id || u._id;
    if (uid === currentUser?.id) return false;
    const search = dmSearch.toLowerCase();
    return (u.full_name?.toLowerCase().includes(search) ||
     u.email?.toLowerCase().includes(search));
  });

  const availableMembers = users.filter(u => {
    const uid = u.id || u._id;
    if (uid === currentUser?.id) return false;
    const isSelected = selectedMembers.some(m => (m.id || m._id) === uid);
    if (isSelected) return false;
    const search = memberSearch.toLowerCase();
    if (!search) return true;
    return u.full_name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search);
  });

  const toggleMember = (user) => {
    const uid = user.id || user._id;
    setSelectedMembers(prev =>
      prev.some(m => (m.id || m._id) === uid)
        ? prev.filter(m => (m.id || m._id) !== uid)
        : [...prev, user]
    );
  };

  const handleSelectUser = async (otherUser) => {
    if (saving) return;
    setSaving(true);
    try {
      const dmName = `dm-${[currentUser.id, otherUser.id].sort().join("-")}`;
      const existing = await base44.entities.MessageChannel.filter({ name: dmName });
      let channel;
      if (existing.length > 0) {
        channel = existing[0];
      } else {
        channel = await base44.entities.MessageChannel.create({
          name: dmName,
          display_name: `${currentUser.full_name} & ${otherUser.full_name || otherUser.email}`,
          channel_type: "dm",
          organization_id: currentUser.organization_id,
          member_ids: [currentUser.id, otherUser.id],
          description: JSON.stringify({
            participants: [
              { id: currentUser.id, name: currentUser.full_name },
              { id: otherUser.id, name: otherUser.full_name || otherUser.email },
            ],
          }),
          sort_order: 100,
        });
      }
      qc.invalidateQueries({ queryKey: ["channels"] });
      onCreated?.(channel);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim()) return;
    setSaving(true);
    try {
      const slug = "#" + channelName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      const memberIds = channelVisibility === "private"
        ? [currentUser.id, ...selectedMembers.map(u => u.id || u._id)]
        : [];
      const channel = await base44.entities.MessageChannel.create({
        organization_id: currentUser.organization_id,
        name: slug,
        display_name: channelName.trim(),
        description: channelDesc.trim(),
        channel_type: "team",
        visibility: channelVisibility,
        is_permanent: true,
        member_ids: memberIds,
        sort_order: 50,
      });
      if (channelVisibility === "private") {
        const allMembers = [
          { id: currentUser.id, full_name: currentUser.full_name, email: currentUser.email, role: currentUser.role },
          ...selectedMembers,
        ];
        await base44.entities.ChannelMembership.bulkCreate(
          allMembers.map(u => ({
            organization_id: currentUser.organization_id,
            channel_id: channel.id,
            user_id: u.id || u._id,
            user_email: u.email || "",
            user_name: u.full_name || u.email || "",
            user_role: u.role || "",
          }))
        );
      }
      qc.invalidateQueries({ queryKey: ["channels"] });
      onCreated?.(channel);
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to create channel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        {canCreateChannel && (
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {[
              { id: "dm", label: "Direct Message", icon: MessageCircle },
              { id: "channel", label: "New Channel", icon: Hash },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                    tab === t.id
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {tab === "dm" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={dmSearch}
                onChange={e => setDmSearch(e.target.value)}
                placeholder="Search team members…"
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {otherUsers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
              )}
              {otherUsers.map(u => (
                <button
                  key={u.id || u._id}
                  onClick={() => handleSelectUser(u)}
                  disabled={saving}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted text-left transition-colors disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{u.role?.replace(/_/g, " ")}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "channel" && canCreateChannel && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Channel Name</Label>
              <Input
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                placeholder="e.g. installs, powder-coat"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={channelDesc}
                onChange={e => setChannelDesc(e.target.value)}
                placeholder="What is this channel for?"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Visibility</Label>
              <div className="mt-1 space-y-1.5">
                <label className={cn(
                  "flex items-start gap-2 cursor-pointer text-sm p-2 rounded-md border transition-colors",
                  channelVisibility === "public" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}>
                  <input type="radio" name="visibility" value="public" checked={channelVisibility === "public"} onChange={() => setChannelVisibility("public")} className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">Public</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Everyone in your organization can see and post</p>
                  </div>
                </label>
                <label className={cn(
                  "flex items-start gap-2 cursor-pointer text-sm p-2 rounded-md border transition-colors",
                  channelVisibility === "private" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}>
                  <input type="radio" name="visibility" value="private" checked={channelVisibility === "private"} onChange={() => setChannelVisibility("private")} className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">Private</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Only invited members can see and post</p>
                  </div>
                </label>
              </div>
            </div>

            {channelVisibility === "private" && (
              <div>
                <Label className="text-xs">Add Members</Label>
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    {selectedMembers.map(m => (
                      <span key={m.id || m._id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                        {m.full_name}
                        <button onClick={() => toggleMember(m)} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search team members to add…"
                    className="pl-8"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5 mt-2">
                  {availableMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
                  )}
                  {availableMembers.map(u => (
                    <button
                      key={u.id || u._id}
                      onClick={() => toggleMember(u)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                        {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Check className="w-4 h-4 text-transparent shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCreateChannel}
              disabled={saving || !channelName.trim()}
              className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating…" : "Create Channel"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}