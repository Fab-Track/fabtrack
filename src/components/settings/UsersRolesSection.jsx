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
import { UserPlus, Pencil, MailOpen, Eye, Table2, Clock, ChevronRight, Ban, CheckCircle2, RefreshCw, KeyRound, X, Users, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useUserCapCheck } from "@/hooks/useUserCapCheck";
import { format } from "date-fns";
import { toast } from "sonner";
import PermissionsMatrix from "./permissions/PermissionsMatrix";
import RolePreviewSection from "./permissions/RolePreviewSection";
import PermissionAuditLog from "./permissions/PermissionAuditLog";
import RoleSummaryCard from "./permissions/RoleSummaryCard";
import RolesTab from "./RolesTab";
import OrgCombobox from "@/components/shared/OrgCombobox";
import { ROLES as PERM_ROLES, ROLE_LABELS, DEFAULT_PERMISSIONS } from "@/lib/permissionsData";

const ROLES = ["owner", "admin", "shop_manager", "estimator", "fabricator", "accountant", "design_specialist"];

function statusBadge(status) {
  if (status === "active") return <Badge className="bg-green-100 text-green-700 text-xs border-0">Active</Badge>;
  if (status === "invited") return <Badge className="bg-yellow-100 text-yellow-700 text-xs border-0">Invited</Badge>;
  if (status === "pending_setup") return <Badge className="bg-blue-100 text-blue-700 text-xs border-0">Pending Setup</Badge>;
  if (status === "locked") return <Badge className="bg-red-100 text-red-700 text-xs border-0">Locked</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">Deactivated</Badge>;
}

function loadPermissions() {
  try {
    const saved = localStorage.getItem("fabtrack_role_permissions");
    return saved ? JSON.parse(saved) : { ...DEFAULT_PERMISSIONS };
  } catch { return { ...DEFAULT_PERMISSIONS }; }
}

const TABS = [
  { id: "users",   label: "Users",              icon: UserPlus },
  { id: "roles",   label: "Roles",              icon: Shield },
  { id: "matrix",  label: "Permissions Matrix", icon: Table2 },
  { id: "preview", label: "Preview Role",        icon: Eye },
  { id: "audit",   label: "Audit Log",           icon: Clock },
];

export default function UsersRolesSection() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const { atCap, userCap, userCount } = useUserCapCheck();
  const isAdminOrOwner = ["admin", "owner"].includes((currentUser?.role || "").toLowerCase());
  const [tab, setTab] = useState("users");
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [invite, setInvite] = useState({ first_name: "", last_name: "", email: "", roles: ["fabricator"], phone: "" });
  const [inviting, setInviting] = useState(false);
  const [summaryRole, setSummaryRole] = useState(null);
  const [showDeactivated, setShowDeactivated] = useState(false);

  const orgId = currentUser?.organization_id;

  const { data: users = [] } = useQuery({
    queryKey: ["users", orgId],
    queryFn: () => orgId ? base44.entities.User.filter({ organization_id: orgId }) : [],
  });

  const permissions = loadPermissions();

  async function handleInvite() {
    if (!invite.email || !invite.first_name) { toast.error("Name and email are required"); return; }
    if (atCap) {
      toast.error(`User cap reached (${userCount}/${userCap}). Upgrade your plan to add more users.`);
      return;
    }
    setInviting(true);
    try {
      const roles = invite.roles?.length ? invite.roles : ["fabricator"];
      const isHighPriv = roles.some(r => r === "owner" || r === "admin");
      const platformRole = isHighPriv ? "admin" : "user";
      const invited = await base44.users.inviteUser(invite.email, platformRole);

      // inviteUser doesn't scope the new User to this organization — do that now
      // so it shows up in this org's Users & Roles table and permission checks.
      const invitedId = invited?.id || invited?.data?.id;
      if (invitedId) {
        await base44.entities.User.update(invitedId, {
          organization_id: orgId,
          organization_name: currentUser?.organization_name || null,
          roles,
          role: roles[0] || "fabricator",
          account_status: "invited",
        });
      }

      toast.success(`Invite sent to ${invite.email}`);
      setShowInvite(false);
      setInvite({ first_name: "", last_name: "", email: "", roles: ["fabricator"], phone: "" });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["org-user-count"] });
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleSaveEdit(form) {
    await base44.entities.User.update(editUser.id, {
      roles: form.roles,
      role: form.roles[0] || "fabricator", // legacy field for backward compat
      organization_id: form.organization_id || null,
      organization_name: form.organization_name || null,
    });
    toast.success("User updated");
    qc.invalidateQueries({ queryKey: ["users"] });
    setEditUser(null);
  }

  async function handleToggleActivation(u) {
    const isDeactivated = u.account_status === "deactivated";
    await base44.entities.User.update(u.id, {
      account_status: isDeactivated ? "active" : "deactivated",
    });
    toast.success(isDeactivated ? "Account reactivated" : "Account deactivated");
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  async function handleUnlock(u) {
    await base44.entities.User.update(u.id, {
      account_status: "active",
      failed_login_count: 0,
      locked_until: null,
    });
    toast.success("Account unlocked");
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  async function handlePasswordReset(u) {
    await base44.auth.sendPasswordResetEmail(u.email);
    toast.success(`Password reset email sent to ${u.email}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base">Users & Roles</h2>
          <p className="text-sm text-muted-foreground">Manage users, permissions, and role access for FabTrack.</p>
        </div>
        {tab === "users" && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDeactivated}
                onChange={e => setShowDeactivated(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Show deactivated
            </label>
            {userCap !== null && (
              <span className={`text-xs ${atCap ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                <Users className="w-3 h-3 inline mr-0.5" />
                {userCount}/{userCap} users
              </span>
            )}
            <Button size="sm" onClick={() => setShowInvite(true)} className="gap-1.5" disabled={atCap}>
              <UserPlus className="w-3.5 h-3.5" /> Invite User
            </Button>
          </div>
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
          {/* Mobile-friendly overflow scroll */}
          <div className="border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Role</th>
                  <th className="px-4 py-2 text-left font-medium">Last Login</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  const visibleUsers = showDeactivated
                    ? users
                    : users.filter(u => (u.account_status || "active") !== "deactivated");
                  if (visibleUsers.length === 0) {
                    return <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No users yet.</td></tr>;
                  }
                  return visibleUsers.map(u => {
                  const userRoleList = (u.roles && u.roles.length > 0) ? u.roles : (u.role ? [u.role] : []);
                  const primaryRoleKey = (userRoleList[0] || "").toLowerCase().replace(/ /g, "_");
                  const status = u.account_status || "active";
                  const isDeactivated = status === "deactivated";
                  const isLocked = status === "locked";
                  return (
                    <tr key={u.id} className={`${isDeactivated ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium">{u.full_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {userRoleList.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : userRoleList.map(r => (
                            <Badge key={r} variant="outline" className="text-[10px] capitalize py-0 px-1.5">{r.replace(/_/g, " ")}</Badge>
                          ))}
                          {PERM_ROLES.includes(primaryRoleKey) && (
                            <button onClick={() => setSummaryRole(primaryRoleKey)} className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 ml-1">
                              View <ChevronRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.last_login_at
                          ? format(new Date(u.last_login_at), "MMM d, yyyy h:mm a")
                          : <span className="italic">Never</span>}
                      </td>
                      <td className="px-4 py-3">{statusBadge(status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditUser(u)} title="Edit role">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {status === "invited" && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Resend invite" onClick={async () => {
                              const ul = (u.roles && u.roles.length > 0) ? u.roles : (u.role ? [u.role] : ["fabricator"]);
                              const isHighPriv = ul.some(r => r === "owner" || r === "admin");
                              const platformRole = isHighPriv ? "admin" : "user";
                              await base44.users.inviteUser(u.email, platformRole);
                              toast.success("Invite resent");
                            }}>
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isLocked && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" title="Unlock account" onClick={() => handleUnlock(u)}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {isAdminOrOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
                              title="Send password reset email"
                              onClick={() => handlePasswordReset(u)}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 w-7 p-0 ${isDeactivated ? "text-green-600" : "text-muted-foreground hover:text-destructive"}`}
                            title={isDeactivated ? "Reactivate" : "Deactivate"}
                            onClick={() => handleToggleActivation(u)}
                          >
                            {isDeactivated ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles tab */}
      {tab === "roles" && <RolesTab />}

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
            <div>
              <Label className="text-xs">Roles (select multiple)</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ROLES.map(r => {
                  const selected = invite.roles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInvite(p => ({
                        ...p,
                        roles: selected ? p.roles.filter(x => x !== r) : [...p.roles, r],
                      }))}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {r.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs">Phone Number</Label>
              <Input className="h-8" value={invite.phone} onChange={e => setInvite(p => ({ ...p, phone: e.target.value }))} placeholder="+1..." />
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
          userCount={users.filter(u => {
            const rl = (u.roles && u.roles.length > 0) ? u.roles : (u.role ? [u.role] : []);
            return rl.some(r => r.toLowerCase() === summaryRole);
          }).length}
          open={!!summaryRole}
          onClose={() => setSummaryRole(null)}
        />
      )}
    </div>
  );
}

function EditUserSheet({ user, onClose, onSave }) {
  const initialRoles = (user.roles && user.roles.length > 0) ? user.roles : (user.role ? [user.role] : ["fabricator"]);
  const [form, setForm] = React.useState({
    roles: initialRoles,
    organization_id: user.organization_id || null,
    organization_name: user.organization_name || "",
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["all-organizations"],
    queryFn: () => base44.entities.Organization.list(),
  });

  function handleOrgChange(org) {
    setForm(p => ({
      ...p,
      organization_id: org?.id || null,
      organization_name: org?.name || "",
    }));
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader><SheetTitle>Edit User — {user.full_name}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs">Email</Label>
            <Input className="h-8" value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Organization</Label>
            <OrgCombobox
              organizations={organizations}
              value={form.organization_id}
              onChange={handleOrgChange}
            />
          </div>
          <div>
            <Label className="text-xs">Organization Name</Label>
            <Input
              className="h-8 bg-muted/50"
              value={form.organization_name || ""}
              disabled
              placeholder="Auto-filled from organization selection"
            />
          </div>
          <div>
            <Label className="text-xs">Roles (select multiple)</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
              {ROLES.map(r => {
                const selected = form.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm(p => ({
                      ...p,
                      roles: selected ? p.roles.filter(x => x !== r) : [...p.roles, r],
                    }))}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize border transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {r.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>
          <Button className="w-full" onClick={() => onSave(form)} disabled={form.roles.length === 0}>Save Changes</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}