import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MessageCircle, Hash } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GENERAL_ROLES, MANAGEMENT_ROLES } from "@/lib/messagingHelpers";
import { cn } from "@/lib/utils";

export default function NewMessageDialog({ onClose, onCreated, currentUser }) {
  const canCreateChannel = ["admin", "owner", "shop_manager"].includes(currentUser?.role);
  const [tab, setTab] = useState("dm");
  const [dmSearch, setDmSearch] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [channelAccess, setChannelAccess] = useState("all");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-dm"],
    queryFn: () => base44.entities.User.list(),
    enabled: tab === "dm",
  });

  const otherUsers = users.filter(u =>
    u.id !== currentUser?.id &&
    (u.full_name?.toLowerCase().includes(dmSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(dmSearch.toLowerCase()))
  );

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
    const slug = "#" + channelName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const memberRoles = channelAccess === "management" ? MANAGEMENT_ROLES : GENERAL_ROLES;
    const channel = await base44.entities.MessageChannel.create({
      name: slug,
      display_name: channelName.trim(),
      description: channelDesc.trim(),
      channel_type: "team",
      is_permanent: true,
      member_roles: memberRoles,
      sort_order: 50,
    });
    qc.invalidateQueries({ queryKey: ["channels"] });
    setSaving(false);
    onCreated?.(channel);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
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
                  key={u.id}
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
              <Label className="text-xs">Access</Label>
              <div className="mt-1 space-y-1.5">
                {[
                  { value: "all", label: "All Team Members" },
                  { value: "management", label: "Management Only" },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="access"
                      value={opt.value}
                      checked={channelAccess === opt.value}
                      onChange={() => setChannelAccess(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
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