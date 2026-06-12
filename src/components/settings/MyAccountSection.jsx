import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Upload, CheckCircle2, Circle, RefreshCw, Trash2, Eye, EyeOff, LogOut } from "lucide-react";
import EmployeeProfileView from "@/components/employees/EmployeeProfileView";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import GmailUserConnectionCard from "./GmailUserConnectionCard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MyAccountSection() {
  const { user, checkUserAuth } = useAuth();
  const qc = useQueryClient();
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const nameParts = (user?.full_name || "").split(" ");
  const [form, setForm] = useState({
    first_name: nameParts[0] || "",
    last_name: nameParts.slice(1).join(" ") || "",
    email: user?.email || "",
    phone: user?.phone || "",
    photo_url: user?.profile_photo_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [uploading, setUploading] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Fetch the employee record — try email, personal_email, name, then created_by_id
  const { data: employees = [], refetch: refetchEmployee } = useQuery({
    queryKey: ["my-employee-record", user?.id, user?.email, user?.full_name],
    queryFn: async () => {
      if (user?.email) {
        const byEmail = await base44.entities.Employee.filter({ email: user.email });
        if (byEmail.length > 0) return byEmail;
        const byPersonalEmail = await base44.entities.Employee.filter({ personal_email: user.email });
        if (byPersonalEmail.length > 0) return byPersonalEmail;
      }
      if (user?.full_name) {
        const byName = await base44.entities.Employee.filter({ name: user.full_name });
        if (byName.length > 0) return byName;
      }
      // Final fallback: created_by_id matches user id
      if (user?.id) {
        const byCreator = await base44.entities.Employee.filter({ created_by_id: user.id });
        if (byCreator.length > 0) return byCreator;
      }
      return [];
    },
    enabled: !!(user?.id || user?.email || user?.full_name),
    staleTime: 15000,
  });
  const myEmployee = employees[0] || null;

  async function handlePhotoUpload(file) {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, photo_url: file_url }));
    await base44.auth.updateMe({ profile_photo_url: file_url });
    setUploading(false);
    toast.success("Photo updated");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const full_name = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(" ");
      await base44.auth.updateMe({ full_name, phone: form.phone });
      qc.invalidateQueries();
      // Refresh the auth context so the name updates everywhere
      if (typeof checkUserAuth === "function") await checkUserAuth();
      toast.success("Account updated successfully");
    } catch (err) {
      toast.error(err?.message || "Failed to save changes. Please try again.");
    }
    setSaving(false);
  }

  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  function meetsRequirements(pw) {
    return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  }

  async function handleChangePassword() {
    setPwError("");
    if (!passwords.current) { setPwError("Enter your current password."); return; }
    if (!meetsRequirements(passwords.next)) {
      setPwError("New password must be at least 8 characters and include an uppercase letter, a number, and a special character.");
      return;
    }
    if (passwords.next !== passwords.confirm) { setPwError("New passwords do not match."); return; }
    setPwLoading(true);
    try {
      await base44.auth.changePassword({ current_password: passwords.current, new_password: passwords.next });
      setPasswords({ current: "", next: "", confirm: "" });
      toast.success("Password updated successfully");
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("incorrect") || msg.includes("wrong") || msg.includes("invalid") || msg.includes("current")) {
        setPwError("Current password is incorrect.");
      } else {
        setPwError(err?.message || "Failed to update password. Please try again.");
      }
    }
    setPwLoading(false);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="font-semibold text-base">My Account</h2>
        <p className="text-sm text-muted-foreground">Personal settings for your FabTrack account.</p>
      </div>

      {/* Profile photo */}
      <div className="flex items-center gap-4">
        {form.photo_url ? (
          <img src={form.photo_url} alt="Profile" className="w-16 h-16 rounded-full object-cover border" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
            {(form.first_name[0] || "?").toUpperCase()}
          </div>
        )}
        <Label className="cursor-pointer">
          <div className="h-8 px-3 text-xs rounded-md border border-input flex items-center gap-1.5 hover:bg-muted transition-colors">
            {uploading ? <><span className="w-3 h-3 border-2 border-t-transparent border-primary rounded-full animate-spin" />Uploading…</> : <><Upload className="w-3 h-3" />Change Photo</>}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }} />
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">First Name</Label>
          <Input className="h-8" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Last Name</Label>
          <Input className="h-8" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Email Address</Label>
        <Input className="h-8 opacity-70" type="email" value={form.email} disabled />
        <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed here. Contact your admin.</p>
      </div>

      <div>
        <Label className="text-xs">Phone Number</Label>
        <Input className="h-8" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1..." />
      </div>

      {/* Employee Profile Card — opens sheet */}
      {myEmployee ? (
        <>
          <div className="border rounded-xl p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">Employee Profile</p>
                <p className="text-sm font-medium">{myEmployee.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{myEmployee.role?.replace(/_/g, " ")}{myEmployee.work_center_primary ? ` · ${myEmployee.work_center_primary}` : ""}</p>
              </div>
              <Button size="sm" onClick={() => setProfileSheetOpen(true)}>View My Full Profile</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">View and edit your personal info, culture, goals, and more.</p>
          </div>

          <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>My Employee Profile</SheetTitle>
              </SheetHeader>
              <EmployeeProfileView employeeId={myEmployee.id} />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <div className="border rounded-xl p-4 bg-muted/30 text-xs text-muted-foreground">
          No employee profile linked to your account. Ask your admin to add your email (<strong>{user?.email}</strong>) to your employee record.
        </div>
      )}

      {/* Gmail connection */}
      {myEmployee && (
        <GmailUserConnectionCard employee={myEmployee} onRefresh={() => refetchEmployee()} />
      )}

      {/* Password change */}
      <div className="space-y-3 pt-2 border-t">
        <h3 className="text-sm font-semibold">Change Password</h3>
        <div>
          <Label className="text-xs">Current Password</Label>
          <Input className="h-8" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">New Password</Label>
          <div className="relative">
            <Input
              className="h-8 pr-9"
              type={showNewPwd ? "text" : "password"}
              value={passwords.next}
              onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))}
              placeholder="Min 8 chars, uppercase, number, special"
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowNewPwd(v => !v)}
            >
              {showNewPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <PasswordStrengthIndicator password={passwords.next} />
        </div>
        <div>
          <Label className="text-xs">Confirm New Password</Label>
          <Input className="h-8" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
          {passwords.confirm && passwords.next !== passwords.confirm && (
            <p className="text-xs text-destructive mt-1">Passwords do not match</p>
          )}
        </div>
        {pwError && (
          <p className="text-xs text-destructive">{pwError}</p>
        )}
        <Button size="sm" variant="outline" onClick={handleChangePassword} disabled={pwLoading}>
          {pwLoading ? <><span className="w-3 h-3 border-2 border-t-transparent border-primary rounded-full animate-spin mr-1.5" />Updating…</> : "Update Password"}
        </Button>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? <><span className="w-3 h-3 border-2 border-t-transparent border-primary-foreground rounded-full animate-spin mr-1.5" />Saving…</> : "Save Changes"}
      </Button>

      {/* Log Out */}
      <div className="pt-2 border-t">
        <Button
          variant="outline"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => base44.auth.logout("/login")}
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </div>

      {/* Delete Account */}
      <div className="space-y-2 pt-4 border-t border-destructive/20">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <p className="text-xs text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your FabTrack account and all data associated with it —
                including your profile, settings, and activity history. <strong>This cannot be undone.</strong>
                {" "}If you need access removed, contact your workspace admin instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  toast.error("Account deletion must be completed by a workspace admin. Please contact support.");
                }}
              >
                Yes, Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}