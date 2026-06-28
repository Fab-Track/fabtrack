import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Shield, Wrench, TrendingUp, Calculator, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

const ARCHETYPES = [
  { key: "admin",      label: "Admin",      icon: Shield },
  { key: "shop_floor", label: "Shop Floor", icon: Wrench },
  { key: "sales",      label: "Sales",      icon: TrendingUp },
  { key: "finance",    label: "Finance",    icon: Calculator },
];

function archBadge(arch) {
  const a = ARCHETYPES.find(x => x.key === arch);
  if (!a) return null;
  const Icon = a.icon;
  const styles = {
    admin:      "bg-blue-100 text-blue-700 border-blue-200",
    shop_floor: "bg-orange-100 text-orange-700 border-orange-200",
    sales:      "bg-green-100 text-green-700 border-green-200",
    finance:    "bg-purple-100 text-purple-700 border-purple-200",
  };
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${styles[a.key] || ""}`}>
      <Icon className="w-3 h-3" />
      {a.label}
    </Badge>
  );
}

function toSnakeCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function RolesTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles", orgId],
    queryFn: () => orgId ? base44.entities.Role.filter({ org_id: orgId }, "name") : [],
    enabled: !!orgId,
  });

  // Fetch users to determine how many are assigned to each role
  const { data: users = [] } = useQuery({
    queryKey: ["users", orgId],
    queryFn: () => orgId ? base44.entities.User.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  function getUserCountForRole(roleId) {
    return users.filter(u => (u.role_ids || []).includes(roleId)).length;
  }

  async function handleDelete(role) {
    const count = getUserCountForRole(role.id);
    if (count > 0) {
      toast.error(`${count} ${count === 1 ? "user is" : "users are"} assigned to this role. Reassign them before deleting.`);
      return;
    }
    try {
      await base44.entities.Role.delete(role.id);
      toast.success(`Role "${role.name}" deleted`);
      qc.invalidateQueries({ queryKey: ["roles", orgId] });
      setDeletingRole(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete role");
    }
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading roles…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define the roles your team can be assigned. Each org manages their own role records.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditRole(null); setShowForm(true); }}>
          <Plus className="w-3.5 h-3.5" /> New Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <Shield className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-medium text-sm">No roles yet</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first role to start assigning it to users.</p>
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Create First Role
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => (
            <div key={role.id} className="border rounded-xl p-4 space-y-2 bg-card hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold text-base leading-tight">{role.name}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{role.key}</p>
                </div>
                {role.is_default && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Default</Badge>
                )}
              </div>

              {role.description && (
                <p className="text-xs text-muted-foreground line-clamp-3 min-h-[2.5rem]">{role.description}</p>
              )}

              <div className="pt-1">
                {archBadge(role.archetype)}
              </div>

              <div className="flex gap-1 pt-2 border-t">
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { setEditRole(role); setShowForm(true); }}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive ml-auto" onClick={() => setDeletingRole(role)}>
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RoleFormModal
          role={editRole}
          orgId={orgId}
          onClose={() => { setShowForm(false); setEditRole(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditRole(null);
            qc.invalidateQueries({ queryKey: ["roles", orgId] });
          }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deletingRole} onOpenChange={(open) => { if (!open) setDeletingRole(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Delete Role</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Are you sure you want to delete <span className="font-medium text-foreground">{deletingRole?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeletingRole(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deletingRole)}>Delete Role</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleFormModal({ role, orgId, onClose, onSaved }) {
  const isEdit = !!role;
  const [name, setName] = useState(role?.name || "");
  const [key, setKey] = useState(role?.key || "");
  const [description, setDescription] = useState(role?.description || "");
  const [archetype, setArchetype] = useState(role?.archetype || "");
  const [saving, setSaving] = useState(false);
  const [keyEdited, setKeyEdited] = useState(false);

  // Auto-generate key from name (create mode only)
  function handleNameChange(val) {
    setName(val);
    if (!isEdit && !keyEdited) {
      setKey(toSnakeCase(val));
    }
  }

  function handleKeyChange(val) {
    setKey(val);
    setKeyEdited(true);
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Display name is required"); return; }
    if (!key.trim()) { toast.error("Key is required"); return; }
    if (!archetype) { toast.error("Archetype is required"); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        key: key.trim(),
        description: description.trim() || undefined,
        archetype,
        org_id: orgId,
      };

      if (isEdit) {
        // Key is locked — don't send it
        delete payload.key;
        delete payload.org_id;
        await base44.entities.Role.update(role.id, payload);
        toast.success("Role updated");
      } else {
        await base44.entities.Role.create(payload);
        toast.success("Role created");
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Role" : "New Role"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-1">
          <div>
            <Label className="text-xs">Display Name *</Label>
            <Input className="h-9 mt-1" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Shop Foreman" />
          </div>
          <div>
            <Label className="text-xs">Key {isEdit && <span className="text-muted-foreground">(locked)</span>}</Label>
            <Input
              className="h-9 mt-1 font-mono text-xs"
              value={key}
              onChange={e => handleKeyChange(e.target.value)}
              disabled={isEdit}
              placeholder="auto-generated from name"
            />
            {!isEdit && (
              <p className="text-[10px] text-muted-foreground mt-1">Auto-generated from the display name. You can edit it before saving — it locks after first save.</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              className="mt-1 min-h-[70px] text-sm"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Sees Job Board, Schedule, and Shop Floor. Can clock in/out."
            />
          </div>
          <div>
            <Label className="text-xs">Archetype *</Label>
            <Select value={archetype} onValueChange={setArchetype}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Select archetype…" />
              </SelectTrigger>
              <SelectContent>
                {ARCHETYPES.map(a => {
                  const Icon = a.icon;
                  return (
                    <SelectItem key={a.key} value={a.key}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        {a.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}