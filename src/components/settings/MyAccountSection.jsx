import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function MyAccountSection() {
  const { user } = useAuth();
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
  const gmailStatus = user?.gmail_token_status || "disconnected";

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
      <div className="border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Gmail Connection</p>
          {gmailStatus === "connected"
            ? <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="w-3 h-3" />Connected</Badge>
            : gmailStatus === "expired"
              ? <Badge className="bg-yellow-100 text-yellow-700 gap-1"><RefreshCw className="w-3 h-3" />Expired</Badge>
              : <Badge variant="outline" className="text-muted-foreground gap-1"><Circle className="w-3 h-3" />Not Connected</Badge>
          }
        </div>
        <p className="text-xs text-muted-foreground">Connect your @highcountrymetalworks.com Gmail to send emails on behalf of your account.</p>
        <Button size="sm" variant="outline" className="gap-1.5">
          {gmailStatus === "expired" ? <><RefreshCw className="w-3.5 h-3.5" />Reconnect Gmail</> : <><CheckCircle2 className="w-3.5 h-3.5" />Connect Gmail</>}
        </Button>
      </div>

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
    </div>
  );
}