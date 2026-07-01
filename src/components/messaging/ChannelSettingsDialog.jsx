import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Trash2, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ChannelMembersSection from "./ChannelMembersSection";

const PREFS = [
  { value: "all", label: "All Messages", desc: "Get notified for every message" },
  { value: "mentions", label: "Mentions Only", desc: "Only when @mentioned" },
  { value: "muted", label: "Muted", desc: "No notifications" },
];

export default function ChannelSettingsDialog({ channel, currentUser, onClose, onChannelUpdated }) {
  const [tab, setTab] = useState("settings");
  const [pref, setPref] = useState("all");
  const [saving, setSaving] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const isAdmin = ["admin", "owner"].includes(currentUser?.role);
  const isDm = channel?.channel_type === "dm";
  const isArchived = channel?.is_archived;
  const isPermanent = channel?.is_permanent;
  const isJobChannel = channel?.channel_type === "job";
  const orgId = currentUser?.organization_id;

  const handleSavePrefs = async () => {
    setSaving(true);
    const uid = currentUser?.id || currentUser?.email;
    try {
      const existing = await base44.entities.ChannelMembership.filter({
        channel_id: channel.id,
        user_id: uid,
      });
      if (existing.length > 0) {
        await base44.entities.ChannelMembership.update(existing[0].id, { notification_pref: pref });
      } else {
        await base44.entities.ChannelMembership.create({
          channel_id: channel.id,
          user_id: uid,
          organization_id: orgId,
          user_email: currentUser?.email,
          user_name: currentUser?.full_name || currentUser?.email,
          user_role: currentUser?.role,
          notification_pref: pref,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Preferences saved");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    const uid = currentUser?.id || currentUser?.email;
    try {
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
          organization_id: orgId,
          user_email: currentUser?.email,
          user_name: currentUser?.full_name || currentUser?.email,
          user_role: currentUser?.role,
          last_read_at: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["messages-unread"] });
      queryClient.invalidateQueries({ queryKey: ["messages", channel.id] });
      toast.success("Marked all as read");
    } catch (err) {
      toast.error(err?.message || "Failed to mark as read");
    } finally {
      setMarkingRead(false);
    }
  };

  const handleToggleArchive = async () => {
    setSaving(true);
    await base44.entities.MessageChannel.update(channel.id, {
      is_archived: !isArchived,
      archived_at: isArchived ? null : new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["channels"] });
    queryClient.invalidateQueries({ queryKey: ["messages", channel.id] });
    if (onChannelUpdated) onChannelUpdated();
    setSaving(false);
    onClose();
  };

  const handleDeleteChannel = async () => {
    setSaving(true);
    const messages = await base44.entities.Message.filter({ channel_id: channel.id }, "created_date", 500);
    for (const msg of messages) {
      await base44.entities.Message.delete(msg.id);
    }
    const members = await base44.entities.ChannelMembership.filter({ channel_id: channel.id });
    for (const m of members) {
      await base44.entities.ChannelMembership.delete(m.id);
    }
    await base44.entities.MessageChannel.delete(channel.id);
    queryClient.invalidateQueries({ queryKey: ["channels"] });
    queryClient.invalidateQueries({ queryKey: ["memberships"] });
    queryClient.invalidateQueries({ queryKey: ["messages-unread"] });
    setSaving(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const SettingsContent = () => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{channel.description}</p>

      {/* Notification Preference */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">Notification Preference</Label>
        <div className="space-y-2">
          {PREFS.map(p => (
            <label key={p.value} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="notif_pref"
                value={p.value}
                checked={pref === p.value}
                onChange={() => setPref(p.value)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium group-hover:text-foreground">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSavePrefs}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save Preferences"}
      </button>

      <Separator />

      {/* Mark All Read */}
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">Actions</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleMarkAllRead}
          disabled={markingRead || saving}
        >
          {markingRead ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
          {markingRead ? "Marking…" : "Mark All as Read"}
        </Button>
      </div>

      {/* Archive / Unarchive — non-permanent channels only */}
      {!isPermanent && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleToggleArchive}
          disabled={saving || !isAdmin}
          title={!isAdmin ? "Only admins can archive channels" : undefined}
        >
          {isArchived ? (
            <>
              <ArchiveRestore className="w-4 h-4" />
              Unarchive Channel
            </>
          ) : (
            <>
              <Archive className="w-4 h-4" />
              Archive Channel
            </>
          )}
        </Button>
      )}

      {/* Delete Channel — admin only for team/job, anyone for DMs */}
      {(!isPermanent || isDm) && isAdmin && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={saving}
        >
          <Trash2 className="w-4 h-4" />
          Delete Channel
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isDm ? channel.display_name : `#${channel.display_name} Settings`}</DialogTitle>
          </DialogHeader>

          {isDm ? (
            <SettingsContent />
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                <TabsTrigger value="members" className="flex-1">Members</TabsTrigger>
              </TabsList>
              <TabsContent value="settings" className="pt-2">
                <SettingsContent />
              </TabsContent>
              <TabsContent value="members" className="pt-2">
                <ChannelMembersSection
                  channel={channel}
                  currentUser={currentUser}
                  onChannelUpdated={onChannelUpdated}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {isDm ? channel.display_name : `#${channel.display_name}`}?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete the channel and all its messages for everyone.
              {isJobChannel && " The job channel will be recreated if the job is still active."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannel}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Deleting…" : "Delete Channel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}