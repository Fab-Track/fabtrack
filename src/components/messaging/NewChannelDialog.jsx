import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { GENERAL_ROLES, MANAGEMENT_ROLES } from "@/lib/messagingHelpers";

export default function NewChannelDialog({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [access, setAccess] = useState("all");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const slug = "#" + name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const memberRoles = access === "management" ? MANAGEMENT_ROLES : GENERAL_ROLES;
    const channel = await base44.entities.MessageChannel.create({
      name: slug,
      display_name: name.trim(),
      description: description.trim(),
      channel_type: "team",
      is_permanent: true,
      member_roles: memberRoles,
      sort_order: 50,
    });
    queryClient.invalidateQueries({ queryKey: ["channels"] });
    setSaving(false);
    onCreated?.(channel);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Team Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <Label className="text-xs">Channel Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. installs, powder-coat"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this channel for?"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Access</Label>
            <div className="mt-1 space-y-1.5">
              {[
                { value: "all", label: "All Team Members" },
                { value: "management", label: "Management Only (Owner, Manager, Estimator, Accountant)" },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" name="access" value={opt.value} checked={access === opt.value} onChange={() => setAccess(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating…" : "Create Channel"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}