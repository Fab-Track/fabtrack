import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useOrgFilter } from "@/lib/orgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Mail, Link2, AlertTriangle, Shield, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const INVITE_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "estimator", label: "Estimator" },
  { value: "installer", label: "Installer" },
  { value: "shop_manager", label: "Shop Manager" },
];

const ROLE_LABELS = Object.fromEntries(INVITE_ROLES.map(r => [r.value, r.label]));

export default function EmployeeInviteSection() {
  const { user: currentUser } = useAuth();
  const orgFilter = useOrgFilter();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "estimator", hire_date: "" });
  const [inviting, setInviting] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", orgFilter],
    queryFn: () => base44.entities.Employee.filter(orgFilter, "-created_date", 200),
  });

  // Find current owner (for protection check)
  const currentOwner = employees.find(e => e.role === "owner" && e.is_active !== false);

  async function handleInvite() {
    if (!invite.name.trim() || !invite.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    // Owner protection: only one owner
    if (invite.role === "owner" && currentOwner && currentOwner.email !== invite.email.trim()) {
      toast.error("There can only be one Owner.");
      return;
    }

    // Check for duplicate email
    const existing = employees.find(e => e.email?.toLowerCase() === invite.email.trim().toLowerCase());
    if (existing) {
      toast.error("An employee with this email already exists");
      return;
    }

    setInviting(true);
    try {
      // 1. Create the Employee record (pending — user_id null)
      await base44.entities.Employee.create({
        name: invite.name.trim(),
        email: invite.email.trim(),
        role: invite.role,
        hire_date: invite.hire_date || null,
        is_active: true,
        organization_id: currentUser?.organization_id,
        user_id: null,
      });

      // 2. Invite the Base44 User
      const isHighPriv = invite.role === "owner" || invite.role === "admin";
      const platformRole = isHighPriv ? "admin" : "user";
      await base44.users.inviteUser(invite.email.trim(), platformRole);

      toast.success(`Invite sent to ${invite.email.trim()}. They'll be linked automatically when they register.`);
      setShowInvite(false);
      setInvite({ name: "", email: "", role: "estimator", hire_date: "" });
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to invite employee";
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(emp, newRole) {
    // Owner protection
    if (newRole === "owner" && currentOwner && currentOwner.id !== emp.id) {
      toast.error("There can only be one Owner.");
      return;
    }
    try {
      await base44.entities.Employee.update(emp.id, { role: newRole });
      // If linked to a user, sync the role
      if (emp.user_id) {
        const isHighPriv = newRole === "owner" || newRole === "admin";
        const platformRole = isHighPriv ? "admin" : "user";
        await base44.entities.User.update(emp.user_id, {
          roles: [newRole],
          role: newRole,
        });
      }
      toast.success(`${emp.name}'s role updated to ${ROLE_LABELS[newRole]}`);
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update role");
    }
  }

  async function handleToggleActive(emp) {
    const newActive = !emp.is_active;
    try {
      await base44.entities.Employee.update(emp.id, { is_active: newActive });
      toast.success(`${emp.name} ${newActive ? "activated" : "deactivated"}`);
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      toast.error("Failed to update employee status");
    }
  }

  async function handleResendInvite(emp) {
    try {
      const isHighPriv = emp.role === "owner" || emp.role === "admin";
      const platformRole = isHighPriv ? "admin" : "user";
      await base44.users.inviteUser(emp.email, platformRole);
      toast.success(`Invite re-sent to ${emp.email}`);
    } catch (err) {
      toast.error("Failed to resend invite");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base">Employees</h2>
          <p className="text-sm text-muted-foreground">
            Invite staff, assign roles, and manage access. Employees are auto-linked to their User account on first login.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)} className="gap-1.5">
          <UserPlus className="w-3.5 h-3.5" /> Invite Employee
        </Button>
      </div>

      {/* Employee table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 border rounded-lg animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <UserPlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No employees yet. Invite your first team member.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Hire Date</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map(emp => (
                <tr key={emp.id} className={`hover:bg-muted/20 ${emp.is_active === false ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-medium">{emp.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{emp.email || "—"}</td>
                  <td className="px-4 py-2.5">
                    <RoleBadge role={emp.role} />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {emp.hire_date ? format(new Date(emp.hire_date), "MMM d, yyyy") : (emp.start_date ? format(new Date(emp.start_date), "MMM d, yyyy") : "—")}
                  </td>
                  <td className="px-4 py-2.5">
                    {emp.user_id ? (
                      <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                        <Link2 className="w-3 h-3" /> Linked
                      </Badge>
                    ) : emp.email ? (
                      <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
                        <Mail className="w-3 h-3" /> Invited
                      </Badge>
                    ) : (
                      <Badge variant="outline">No email</Badge>
                    )}
                    {emp.is_active === false && (
                      <Badge variant="outline" className="ml-1 text-muted-foreground">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded-md p-1.5 hover:bg-muted">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                        {INVITE_ROLES.map(r => (
                          <DropdownMenuItem
                            key={r.value}
                            onClick={() => handleRoleChange(emp, r.value)}
                            className={emp.role === r.value ? "bg-accent/50" : ""}
                          >
                            {r.label}
                            {emp.role === r.value && <Shield className="w-3 h-3 ml-auto" />}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(emp)}>
                          {emp.is_active === false ? "Activate" : "Deactivate"}
                        </DropdownMenuItem>
                        {!emp.user_id && emp.email && (
                          <DropdownMenuItem onClick={() => handleResendInvite(emp)}>
                            <Mail className="w-3.5 h-3.5 mr-1.5" /> Resend Invite
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Owner protection notice */}
      {currentOwner && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <Shield className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Current Owner: <strong>{currentOwner.name}</strong> ({currentOwner.email}). Only one employee can hold the Owner role at a time.</p>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Invite New Employee
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={invite.name}
                onChange={e => setInvite(p => ({ ...p, name: e.target.value }))}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={invite.email}
                onChange={e => setInvite(p => ({ ...p, email: e.target.value }))}
                placeholder="john@yourshop.com"
              />
              <p className="text-xs text-muted-foreground">They'll receive a registration link at this address.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={invite.role}
                  onValueChange={v => setInvite(p => ({ ...p, role: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVITE_ROLES.map(r => (
                      <SelectItem
                        key={r.value}
                        value={r.value}
                        disabled={r.value === "owner" && currentOwner}
                      >
                        {r.label}
                        {r.value === "owner" && currentOwner && " (taken)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hire Date</Label>
                <Input
                  type="date"
                  value={invite.hire_date}
                  onChange={e => setInvite(p => ({ ...p, hire_date: e.target.value }))}
                />
              </div>
            </div>
            {invite.role === "owner" && currentOwner && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>There can only be one Owner. <strong>{currentOwner.name}</strong> is already the Owner.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? "Sending invite…" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    estimator: "bg-emerald-100 text-emerald-700",
    installer: "bg-amber-100 text-amber-700",
    shop_manager: "bg-indigo-100 text-indigo-700",
  };
  const label = ROLE_LABELS[role] || role?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—";
  return (
    <Badge className={`${styles[role] || "bg-gray-100 text-gray-700"} border-0`}>
      {label}
    </Badge>
  );
}