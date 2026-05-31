import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserPlus, Pencil, MailOpen, Eye, Table2, Clock, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import PermissionsMatrix from "./permissions/PermissionsMatrix";
import RolePreviewSection from "./permissions/RolePreviewSection";
import PermissionAuditLog from "./permissions/PermissionAuditLog";
import RoleSummaryCard from "./permissions/RoleSummaryCard";
import { ROLES as PERM_ROLES, ROLE_LABELS, DEFAULT_PERMISSIONS } from "@/lib/permissionsData";

const ROLES = ["owner", "admin", "shop_manager", "estimator", "fabricator", "accountant", "design_specialist"];

function statusBadge(status) {
  if (status === "active") return <Badge className="bg-green-100 text-green-700 text-[10px]">Active</Badge>;
  if (status === "invited") return <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Invited</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">Deactivated</Badge>;
}

function loadPermissions() {
  try {
    const saved = localStorage.getItem("fabtrack_role_permissions");
    return saved ? JSON.parse(saved) : { ...DEFAULT_PERMISSIONS };
  } catch { return { ...DEFAULT_PERMISSIONS }; }
}

const TABS = [
  { id: "users",   label: "Users",              icon: UserPlus },
  { id: "matrix",  label: "Permissions Matrix", icon: Table2 },
  { id: "preview", label: "Preview Role",        icon: Eye },
  { id: "audit",   label: "Audit Log",           icon: Clock },
];

export default function UsersRolesSection() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("users");
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [invite, setInvite] = useState({ first_name: "", last_name: "", email: "", role: "fabricator", phone: "" });
  const [inviting, setInviting] = useState(false);
  const [summaryRole, setSummaryRole] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const permissions = loadPermissions();

  async function handleInvite() {
    if (!invite.email || !invite.first_name) { toast.error("Name and email are required"); return; }
    setInviting(true);
    await base44.users.inviteUser(invite.email, invite.role);
    toast.success(`Invite sent to ${invite.email}`);
    setInviting(false);
    setShowInvite(false);
    setInvite({ first_name: "", last_name: "", email: "", role: "fabricator", phone: "" });
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  async function handleSaveEdit(form) {
    await base44.entities.User.update(editUser.id, { role: form.role });
    toast.success("User updated");
    qc.invalidateQueries({ queryKey: ["users"] });
    setEditUser(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base">Users & Roles</h2>
          <p className="text-sm text-muted-foreground">Manage users, permissions, and role access for FabTrack.</p>
        </div>
        {tab === "users" && (
          <Button size="sm" onClick={() => setShowInvite(true)} className="gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Invite User
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b gap-0.5">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_80px_120px] gap-2 px-4 py-2 bg-muted/30 border-b text-xs font-medium text-muted-foreground">
              <span>Name</span><span>Email</span><span>Role</span><span>Phone</span><span>Status</span><span>Actions</span>
            </div>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
            ) : (
              <div className="divide-y">
                {users.map(u => {
                  const roleKey = (u.role || "").toLowerCase().replace(" ", "_");
                  const userCount = users.filter(x => (x.role || "").toLowerCase() === u.role?.toLowerCase()).length;
                  return (
                    <div key={u.id} className="grid grid-cols-[1fr_1.2fr_1fr_1fr_80px_120px] gap-2 px-4 py-3 items-center text-sm">
                      <span className="font-medium truncate">{u.full_name || "—"}</span>
                      <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs capitalize">{(u.role || "—").replace("_", " ")}</span>
                        {PERM_ROLES.includes(roleKey) && (
                          <button
                            onClick={() => setSummaryRole(roleKey)}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            View <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{u.phone || "—"}</span>
                      <span>{statusBadge(u.status || "active")}</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditUser(u)} title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {u.status === "invited" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Resend invite">
                            <MailOpen className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Matrix tab */}
      {tab === "matrix" && <PermissionsMatrix />}

      {/* Preview tab */}
      {tab === "preview" && <RolePreviewSection />}

      {/* Audit log tab */}
      {tab === "audit" && <PermissionAuditLog />}

      {/* Invite modal */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input className="h-8" value={invite.first_name} onChange={e => setInvite(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input className="h-8" value={invite.last_name} onChange={e => setInvite(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email Address *</Label>
              <Input className="h-8" type="email" value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={invite.role} onValueChange={v => setInvite(p => ({ ...p, role: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input className="h-8" value={invite.phone} onChange={e => setInvite(p => ({ ...p, phone: e.target.value }))} placeholder="+1..." />
              </div>
            </div>
            <Button onClick={handleInvite} disabled={inviting} className="w-full gap-1.5">
              {inviting ? "Sending…" : <><MailOpen className="w-3.5 h-3.5" /> Send Invite</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit user sheet */}
      {editUser && (
        <EditUserSheet user={editUser} onClose={() => setEditUser(null)} onSave={handleSaveEdit} />
      )}

      {/* Role summary card */}
      {summaryRole && (
        <RoleSummaryCard
          role={summaryRole}
          permissions={permissions[summaryRole] || DEFAULT_PERMISSIONS[summaryRole] || {}}
          userCount={users.filter(u => (u.role || "").toLowerCase() === summaryRole).length}
          open={!!summaryRole}
          onClose={() => setSummaryRole(null)}
        />
      )}
    </div>
  );
}

function EditUserSheet({ user, onClose, onSave }) {
  const [form, setForm] = React.useState({ role: user.role || "fabricator" });
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader><SheetTitle>Edit User — {user.full_name}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs">Email</Label>
            <Input className="h-8" value={user.email} disabled />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={() => onSave(form)}>Save Changes</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}