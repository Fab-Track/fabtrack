import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Pencil, Image } from "lucide-react";

const DEFAULT_NAMES = [
  "Inspiration Photos",
  "Before / Measure Photos",
  "House Plans",
  "Cut List",
  "After / Install Photos",
  "Miscellaneous",
];

export default function AttachmentCategoriesSection() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVersioning, setNewVersioning] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editVersioning, setEditVersioning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [orgId, setOrgId] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["attachment-categories", orgId],
    queryFn: () => orgId ? base44.entities.AttachmentCategory.filter({ organization_id: orgId }, "sort_order", 50) : [],
    enabled: !!orgId,
  });

  // Seed defaults if no categories exist
  const seedDefaults = async () => {
    setSaving(true);
    for (let i = 0; i < DEFAULT_NAMES.length; i++) {
      const name = DEFAULT_NAMES[i];
      const usesVersioning = name === "Cut List" || name === "House Plans";
      await base44.entities.AttachmentCategory.create({
        name,
        sort_order: (i + 1) * 10,
        uses_versioning: usesVersioning,
        is_active: true,
        organization_id: orgId,
      });
    }
    qc.invalidateQueries({ queryKey: ["attachment-categories"] });
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
    await base44.entities.AttachmentCategory.create({
      name: newName.trim(),
      sort_order: maxOrder + 10,
      uses_versioning: newVersioning,
      is_active: true,
      organization_id: orgId,
    });
    qc.invalidateQueries({ queryKey: ["attachment-categories"] });
    setNewName("");
    setNewVersioning(false);
    setShowAdd(false);
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editName.trim() || !editing) return;
    setSaving(true);
    await base44.entities.AttachmentCategory.update(editing.id, {
      name: editName.trim(),
      uses_versioning: editVersioning,
    });
    qc.invalidateQueries({ queryKey: ["attachment-categories"] });
    setEditing(null);
    setSaving(false);
  };

  const handleDelete = async (cat) => {
    setSaving(true);
    await base44.entities.AttachmentCategory.delete(cat.id);
    qc.invalidateQueries({ queryKey: ["attachment-categories"] });
    setSaving(false);
  };

  const handleToggleActive = async (cat) => {
    await base44.entities.AttachmentCategory.update(cat.id, {
      is_active: !cat.is_active,
    });
    qc.invalidateQueries({ queryKey: ["attachment-categories"] });
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setEditName(cat.name);
    setEditVersioning(cat.uses_versioning || false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Image className="w-5 h-5" /> Attachment Categories
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage the category list used in job attachment uploads and display.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Loading…</p>
      ) : categories.length === 0 ? (
        <div className="border rounded-xl p-8 text-center">
          <Image className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No attachment categories set up yet.</p>
          <Button variant="outline" size="sm" onClick={seedDefaults} disabled={saving}>
            {saving ? "Loading Defaults…" : "Load Default Categories"}
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(cat => (
            <div
              key={cat.id}
              className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors ${
                cat.is_active ? "" : "opacity-50"
              }`}
            >
              <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cat.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {cat.uses_versioning && (
                    <Badge variant="outline" className="text-[10px]">Versioned</Badge>
                  )}
                  {!cat.is_active && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Hidden</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center gap-2 mr-2">
                  <Switch
                    checked={cat.is_active}
                    onCheckedChange={() => handleToggleActive(cat)}
                    aria-label="Toggle active"
                  />
                  <Label className="text-xs text-muted-foreground hidden sm:inline">Active</Label>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(cat)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Attachment Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Weld Photos"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newVersioning}
                onCheckedChange={setNewVersioning}
                id="add-versioning"
              />
              <Label htmlFor="add-versioning" className="text-sm">
                Enable versioning (files stack instead of listing separately)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setNewName(""); setNewVersioning(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || saving}>
              {saving ? "Adding…" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editVersioning}
                onCheckedChange={setEditVersioning}
                id="edit-versioning"
              />
              <Label htmlFor="edit-versioning" className="text-sm">
                Enable versioning
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}