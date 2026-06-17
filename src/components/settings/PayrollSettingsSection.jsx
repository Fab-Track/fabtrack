/**
 * PayrollSettingsSection — admin settings for payroll workweek start day.
 */
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Info } from "lucide-react";

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday (FLSA default)" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function PayrollSettingsSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(1);
  const [saving, setSaving] = useState(false);

  const [orgId, setOrgId] = useState(null);
  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.organization_id || null)).catch(() => {});
  }, []);

  const { data: settingsArr = [] } = useQuery({
    queryKey: ["appSettings", orgId],
    queryFn: () => orgId ? base44.entities.AppSettings.filter({ setting_key: "main", organization_id: orgId }) : [],
    enabled: !!orgId,
  });
  const settings = settingsArr[0] || null;

  useEffect(() => {
    if (settings?.payroll_workweek_start_day != null) {
      setWeekStart(settings.payroll_workweek_start_day);
    }
  }, [settings]);

  const save = async () => {
    if (!orgId) return toast({ title: "Organization not loaded", variant: "destructive" });
    setSaving(true);
    if (settings) {
      await base44.entities.AppSettings.update(settings.id, { payroll_workweek_start_day: weekStart });
    } else {
      await base44.entities.AppSettings.create({ setting_key: "main", payroll_workweek_start_day: weekStart, organization_id: orgId });
    }
    qc.invalidateQueries({ queryKey: ["appSettings"] });
    toast({ title: "Payroll settings saved" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payroll Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure how workweeks are calculated for overtime and payroll reports.</p>
      </div>

      <div className="border rounded-xl p-5 bg-card space-y-5">
        <div className="space-y-2">
          <Label className="font-medium">Workweek Start Day</Label>
          <p className="text-xs text-muted-foreground">
            This defines when the 40-hour overtime calculation resets. Under FLSA, any consistent 7-day period is valid.
          </p>
          <Select value={String(weekStart)} onValueChange={v => setWeekStart(Number(v))}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map(d => (
                <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Pay Periods:</strong> Semi-monthly — 1st through 15th, and 16th through end of month.</p>
            <p><strong>Overtime:</strong> Calculated weekly (FLSA). Hours over 40 in any workweek are overtime, regardless of pay period boundaries.</p>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}