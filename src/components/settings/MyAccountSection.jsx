import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, Circle, RefreshCw, Trash2 } from "lucide-react";
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
  const { user } = useAuth();
  const qc = useQueryClient();
  const nameParts = (user?.full_name || "").split(" ");
  const [form, setForm] = useState({
    first_name: nameParts[0] || "",
    last_name: nameParts.slice(1).join(" ") || "",
    email: user?.email || "",
    phone: user?.phone || "",
    photo_url: user?.profile_photo_url || "",
  });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [uploading, setUploading] = useState(false);

  // Fetch the employee record that matches this user's email for Gmail status
  const { data: employees = [], refetch: refetchEmployee } = useQuery({
    queryKey: ["my-employee-record", user?.email],
    queryFn: () => base44.entities.Employee.filter({ email: user?.email }),
    enabled: !!user?.email,
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
    await base44.auth.updateMe({
      phone: form.phone,
    });
    toast.success("Account updated");
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

      {/* Gmail connection */}
      {myEmployee && (
        <GmailUserConnectionCard employee={myEmployee} onRefresh={() => refetchEmployee()} />
      )}
      {!myEmployee && (
        <div className="border rounded-xl p-4 text-xs text-muted-foreground">
          No employee record linked to your account email. Ask your admin to create one.
        </div>
      )}

      {/* Password change */}
      <div className="space-y-3 pt-2 border-t">
        <h3 className="text-sm font-semibold">Change Password</h3>
        <div>
          <Label className="text-xs">Current Password</Label>
          <Input className="h-8" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">New Password</Label>
            <Input className="h-8" type="password" value={passwords.next} onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Confirm Password</Label>
            <Input className="h-8" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => toast.info("Password change requires re-authentication")}>
          Update Password
        </Button>
      </div>

      <Button onClick={handleSave} className="w-full sm:w-auto">Save Changes</Button>

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