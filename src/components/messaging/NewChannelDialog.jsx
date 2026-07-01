import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewChannelDialog({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const slug = "#" + name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const channel = await base44.entities.MessageChannel.create({
      name: slug,
      display_name: name.trim(),
      description: description.trim(),
      channel_type: "team",
      visibility,
      is_permanent: true,
      member_ids: [],
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
            <Label className="text-xs">Visibility</Label>
            <div className="mt-1 space-y-1.5">
              <label className={cn(
                "flex items-start gap-2 cursor-pointer text-sm p-2 rounded-md border transition-colors",
                visibility === "public" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}>
                <input type="radio" name="vis" value="public" checked={visibility === "public"} onChange={() => setVisibility("public")} className="mt-0.5" />
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
                visibility === "private" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}>
                <input type="radio" name="vis" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} className="mt-0.5" />
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