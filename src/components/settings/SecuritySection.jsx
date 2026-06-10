import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const ROLES = ["owner", "admin", "shop_manager", "estimator", "fabricator", "installer", "accountant", "design_specialist"];

export default function SecuritySection() {
  const qc = useQueryClient();

  const { data: settingsArr = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: "global" }),
  });
  const settings = settingsArr[0] || {};

  const [mobileHours, setMobileHours] = useState("");
  const [desktopHours, setDesktopHours] = useState("");
  const [required2fa, setRequired2fa] = useState(null);

  // Initialize local state from fetched settings
  React.useEffect(() => {
    if (settingsArr.length > 0) {
      const mH = settings.session_timeout_mobile_hours ?? 8;
      const dH = settings.session_timeout_desktop_hours ?? 4;
      setMobileHours(String(mH));
      setDesktopHours(String(dH));
      setRequired2fa(settings.require_2fa_roles ?? []);
      // Sync to localStorage for AuthContext inactivity timer
      localStorage.setItem("fabtrack_mobile_timeout_hours", String(mH));
      localStorage.setItem("fabtrack_desktop_timeout_hours", String(dH));
    }
  }, [settingsArr.length]);

  const saveMutation = useMutation({
    mutationFn: async (patch) => {
      if (settings.id) {
        return base44.entities.AppSettings.update(settings.id, patch);
      } else {
        return base44.entities.AppSettings.create({ setting_key: "global", ...patch });
      }
    },
    onSuccess: () => {
      toast.success("Security settings saved");
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });

  function toggle2faRole(role) {
    setRequired2fa(prev => {
      const current = prev || [];
      return current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role];
    });
  }

  function handleSave() {
    const mH = Number(mobileHours) || 8;
    const dH = Number(desktopHours) || 4;
    localStorage.setItem("fabtrack_mobile_timeout_hours", String(mH));
    localStorage.setItem("fabtrack_desktop_timeout_hours", String(dH));
    saveMutation.mutate({
      session_timeout_mobile_hours: mH,
      session_timeout_desktop_hours: dH,
      require_2fa_roles: required2fa || [],
    });
  }

  const r2fa = required2fa ?? (settings.require_2fa_roles || []);

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="font-semibold text-base flex items-center gap-2">
          <Shield className="w-4 h-4" /> Security Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure session timeouts and two-factor authentication policies.
        </p>
      </div>

      {/* Session Timeout */}
      <div className="border rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold">Session Timeout</h3>
        <p className="text-xs text-muted-foreground">
          Inactive sessions will be automatically logged out after the specified duration.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Mobile (hours)</Label>
            <Input
              type="number"
              min={1}
              max={72}
              className="h-8"
              value={mobileHours}
              onChange={e => setMobileHours(e.target.value)}
              placeholder="8"
            />
            <p className="text-[10px] text-muted-foreground">Default: 8 hours</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Desktop (hours)</Label>
            <Input
              type="number"
              min={1}
              max={72}
              className="h-8"
              value={desktopHours}
              onChange={e => setDesktopHours(e.target.value)}
              placeholder="4"
            />
            <p className="text-[10px] text-muted-foreground">Default: 4 hours</p>
          </div>
        </div>
      </div>

      {/* 2FA Requirements */}
      <div className="border rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold">Two-Factor Authentication (2FA)</h3>
        <p className="text-xs text-muted-foreground">
          Select roles that are required to have 2FA enabled. Employees in these roles will be prompted to set up 2FA on their next login.
        </p>
        <div className="space-y-2">
          {ROLES.map(role => (
            <div key={role} className="flex items-center justify-between py-1">
              <span className="text-sm capitalize">{role.replace(/_/g, " ")}</span>
              <Switch
                checked={r2fa.includes(role)}
                onCheckedChange={() => toggle2faRole(role)}
              />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-1.5">
        {saveMutation.isPending ? "Saving…" : "Save Security Settings"}
      </Button>
    </div>
  );
}