import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const PREFS = [
  { value: "all", label: "All Messages", desc: "Get notified for every message" },
  { value: "mentions", label: "Mentions Only", desc: "Only when @mentioned" },
  { value: "muted", label: "Muted", desc: "No notifications" },
];

export default function ChannelSettingsDialog({ channel, currentUser, onClose }) {
  const [pref, setPref] = useState("all");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>#{channel.display_name} Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-xs text-muted-foreground">{channel.description}</p>
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
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}