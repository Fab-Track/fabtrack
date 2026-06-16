import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Trash2, CheckCheck } from "lucide-react";

const PREFS = [
  { value: "all", label: "All Messages", desc: "Get notified for every message" },
  { value: "mentions", label: "Mentions Only", desc: "Only when @mentioned" },
  { value: "muted", label: "Muted", desc: "No notifications" },
];

export default function ChannelSettingsDialog({ channel, currentUser, onClose, onChannelUpdated }) {
  const [pref, setPref] = useState("all");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const isAdmin = ["admin", "owner"].includes(currentUser?.role);
  const isArchived = channel?.is_archived;
  const isPermanent = channel?.is_permanent;
  const isJobChannel = channel?.channel_type === "job";

  const handleSavePrefs = async () => {
    setSaving(true);
    const uid = currentUser?.id || currentUser?.email;
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
        user_email: currentUser?.email,
        user_name: currentUser?.full_name || currentUser?.email,
        user_role: currentUser?.role,
        notification_pref: pref,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["memberships"] });
    setSaving(false);
    onClose();
  };

  const handleMarkAllRead = async () => {
    setSaving(true);
    const uid = currentUser?.id || currentUser?.email;
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
        user_email: currentUser?.email,
        user_name: currentUser?.full_name || currentUser?.email,
        user_role: currentUser?.role,
        last_read_at: new Date().toISOString(),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["memberships"] });
    queryClient.invalidateQueries({ queryKey: ["messages-unread"] });
    setSaving(false);
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
    // Delete all messages in the channel first
    const messages = await base44.entities.Message.filter({ channel_id: channel.id }, "created_date", 500);
    for (const msg of messages) {
      await base44.entities.Message.delete(msg.id);
    }
    // Delete memberships
    const members = await base44.entities.ChannelMembership.filter({ channel_id: channel.id });
    for (const m of members) {
      await base44.entities.ChannelMembership.delete(m.id);
    }
    // Delete the channel
    await base44.entities.MessageChannel.delete(channel.id);
    queryClient.invalidateQueries({ queryKey: ["channels"] });
    queryClient.invalidateQueries({ queryKey: ["memberships"] });
    queryClient.invalidateQueries({ queryKey: ["messages-unread"] });
    setSaving(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>#{channel.display_name} Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
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
                disabled={saving}
              >
                <CheckCheck className="w-4 h-4" />
                Mark All as Read
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
            {(!isPermanent || channel?.channel_type === "dm") && isAdmin && (
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
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete #{channel.display_name}?</AlertDialogTitle>
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