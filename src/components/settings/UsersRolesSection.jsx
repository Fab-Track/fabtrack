import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserPlus, Pencil, Trash2, Eye, Table2, Clock, ChevronRight, Ban, CheckCircle2, RefreshCw, KeyRound, Users, Shield, Mail } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useUserCapCheck } from "@/hooks/useUserCapCheck";
import { format } from "date-fns";
import { toast } from "sonner";
import PermissionsMatrix from "./permissions/PermissionsMatrix";
import RolePreviewSection from "./permissions/RolePreviewSection";
import PermissionAuditLog from "./permissions/PermissionAuditLog";
import RoleSummaryCard from "./permissions/RoleSummaryCard";
import RolesTab from "./RolesTab";
import { ROLES as PERM_ROLES, DEFAULT_PERMISSIONS } from "@/lib/permissionsData";

const ROLES = ["owner", "admin", "shop_manager", "estimator", "fabricator", "accountant", "design_specialist"];

function statusBadge(status) {
  if (status === "active") return <Badge className="bg-green-100 text-green-700 text-xs border-0">Active</Badge>;
  if (status === "pending_invite") return <Badge className="bg-blue-100 text-blue-700 text-xs border-0">Invited (pending)</Badge>;
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

const EMPTY_INVITE = { first_name: "", last_name: "", email: "", roles: ["fabricator"], phone: "" };

export default function UsersRolesSection() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const { atCap, userCap, userCount } = useUserCapCheck();
  const isAdminOrOwner = ["admin", "owner"].includes((currentUser?.role || "").toLowerCase());
  const isSuperAdmin = (currentUser?.roles || []).includes("super_admin") || currentUser?.role === "super_admin";
  const [tab, setTab] = useState("users");
  const [showInvite, setShowInvite] = useState(false);
  const [editingInvite, setEditingInvite] = useState(null); // null = creating a new invite
  const [editUser, setEditUser] = useState(null);
  const [invite, setInvite] = useState(EMPTY_INVITE);
  const [inviting, setInviting] = useState(false);
  const [summaryRole, setSummaryRole] = useState(null);
  const [showDeactivated, setShowDeactivated] = useState(false);

  const orgId = currentUser?.organization_id;

  const { data: users = [] } = useQuery({
    queryKey: ["users", orgId],
    queryFn: () => orgId ? base44.entities.User.filter({ organization_id: orgId }) : [],
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ["pendingInvites", orgId],
    queryFn: () => orgId ? base44.entities.PendingInvite.filter({ organization_id: orgId }) : [],
  });

  const permissions = loadPermissions();

  function openCreateInvite() {
    setEditingInvite(null);
    setInvite(EMPTY_INVITE);
    setShowInvite(true);
  }

  function openEditInvite(inv) {
    setEditingInvite(inv);
    setInvite({
      first_name: inv.first_name || "",
      last_name: inv.last_name || "",
      email: inv.email || "",
      roles: inv.roles?.length ? inv.roles : ["fabricator"],
      phone: inv.phone || "",
    });
    setShowInvite(true);
  }

  function closeInviteDialog() {
    setShowInvite(false);
    setEditingInvite(null);
    setInvite(EMPTY_INVITE);
  }

  async function handleInvite() {
    try {
      if (!invite.email || !invite.first_name) { toast.error("Name and email are required"); return; }
      if (!editingInvite && atCap) {
        toast.error(`User cap reached (${userCount}/${userCap}). Upgrade your plan to add more users.`);
        return;
      }
      setInviting(true);
      const roles = invite.roles?.length ? invite.roles : ["fabricator"];

      if (editingInvite) {
        await base44.functions.invoke("inviteOrgUser", {
          action: "update",
          invite_id: editingInvite.id,
          email: invite.email,
          roles,
          first_name: invite.first_name,
          last_name: invite.last_name,
          phone: invite.phone,
        });
        toast.success("Invite updated");
      } else {
        const { data } = await base44.functions.invoke("inviteOrgUser", {
          action: "create",
          email: invite.email,
          roles,
          first_name: invite.first_name,
          last_name: invite.last_name,
          phone: invite.phone,
        });
        if (data.email_sent) {
          toast.success(`Invite email sent to ${invite.email}. Their account activates automatically once they register with that address.`);
        } else {
          toast.warning(`Invite created for ${invite.email}, but the email failed to send (${data.email_error || "unknown error"}). Let them know to register at the app using this exact email address — their account will activate automatically.`);
        }
      }

      closeInviteDialog();
      qc.invalidateQueries({ queryKey: ["pendingInvites"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["org-user-count"] });
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save invite");
    } finally {
      setInviting(false);
    }
  }

  const [resendingId, setResendingId] = useState(null);

  async function handleResendInvite(inv) {
    setResendingId(inv.id);
    try {
      const { data } = await base44.functions.invoke("inviteOrgUser", { action: "resend", invite_id: inv.id });
      if (data.email_sent) {
        toast.success(`Invite email resent to ${inv.email}`);
      } else {
        toast.error(`Failed to resend invite: ${data.email_error || "unknown error"}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  }

  async function handleDeleteInvite(inv) {
    try {
      await base44.functions.invoke("inviteOrgUser", { action: "delete", invite_id: inv.id });
      toast.success("Invite deleted");
      qc.invalidateQueries({ queryKey: ["pendingInvites"] });
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete invite");
    }
  }

  async function handleToggleActivation(u) {
    const isDeactivated = u.account_status === "deactivated";
    try {
      await base44.functions.invoke("manageOrgUsers", {
        organizationId: orgId,
        action: isDeactivated ? "reactivate" : "deactivate",
        targetEmail: u.email,
      });
      toast.success(isDeactivated ? "Account reactivated" : "Account deactivated");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update account status");
    }
  }

  async function handleUnlock(u) {
    try {
      await base44.functions.invoke("manageOrgUsers", {
        organizationId: orgId,
        action: "reactivate",
        targetEmail: u.email,
      });
      toast.success("Account status restored. Note: lockout counters reset automatically on next successful login.");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to unlock account");
    }
  }

  async function handlePasswordReset(u) {
    await base44.auth.resetPasswordRequest(u.email);
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
            <Button size="sm" onClick={openCreateInvite} className="gap-1.5" disabled={atCap}>
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
                {pendingInvites.map(inv => (
                  <tr key={`invite-${inv.id}`} className="bg-blue-50/40">
                    <td className="px-4 py-3 font-medium">{[inv.first_name, inv.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inv.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {(inv.roles || []).map(r => (
                          <Badge key={r} variant="outline" className="text-[10px] capitalize py-0 px-1.5">{r.replace(/_/g, " ")}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground italic">Not registered yet</td>
                    <td className="px-4 py-3">{statusBadge("pending_invite")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditInvite(inv)} title="Edit invite">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600" onClick={() => handleResendInvite(inv)} disabled={resendingId === inv.id} title="Resend invite email">
                          {resendingId === inv.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteInvite(inv)} title="Delete invite">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(() => {
                  const visibleUsers = showDeactivated
                    ? users
                    : users.filter(u => (u.account_status || "active") !== "deactivated");
                  if (visibleUsers.length === 0 && pendingInvites.length === 0) {
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
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditUser(u)} title="View user details">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {isLocked && isSuperAdmin && (
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
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 w-7 p-0 ${isDeactivated ? "text-green-600" : "text-muted-foreground hover:text-destructive"}`}
                              title={isDeactivated ? "Reactivate" : "Deactivate"}
                              onClick={() => handleToggleActivation(u)}
                            >
                              {isDeactivated ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </Button>
                          )}
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

      {/* Invite / edit invite modal */}
      <Dialog open={showInvite} onOpenChange={(open) => !open && closeInviteDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingInvite ? "Edit Invite" : "Invite User"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-1">
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 bg-muted/40 rounded-md p-2">
              <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              They'll be emailed instructions to register at FabTrack using this exact email address. Their account activates and joins your organization automatically as soon as they sign up.
            </p>
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
              {inviting
                ? (editingInvite ? "Saving…" : "Sending…")
                : <>{editingInvite ? <><Pencil className="w-3.5 h-3.5" /> Save Changes</> : <><Mail className="w-3.5 h-3.5" /> Send Invite</>}</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View user sheet (read-only — role/org changes are made in the Super Admin area) */}
      {editUser && (
        <EditUserSheet user={editUser} onClose={() => setEditUser(null)} />
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

function EditUserSheet({ user, onClose }) {
  const roleList = (user.roles && user.roles.length > 0) ? user.roles : (user.role ? [user.role] : []);

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader><SheetTitle>User Details — {user.full_name}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-xs">Email</Label>
            <Input className="h-8" value={user.email} disabled />
          </div>
          <div>
            <Label className="text-xs">Organization</Label>
            <Input className="h-8 bg-muted/50" value={user.organization_name || "—"} disabled />
          </div>
          <div>
            <Label className="text-xs">Roles</Label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
              {roleList.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : roleList.map(r => (
                <Badge key={r} variant="outline" className="text-[11px] capitalize py-0.5 px-2">{r.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-md p-2">
            Role and organization changes are managed in the Super Admin area.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}