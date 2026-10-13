import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import RateField from "./RateField";

const NUM_FIELDS = [
  "labor_fab_rate", "labor_install_rate", "default_target_margin_pct", "fuel_price_per_gal",
  "truck_mpg", "install_hours_per_day", "job_minimum", "deposit_pct", "estimate_valid_days",
];
const DEFAULTS = { default_target_margin_pct: 33.3, install_hours_per_day: 8, job_minimum: 2000, deposit_pct: 50, estimate_valid_days: 30 };

export default function RatesDefaultsCard() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [fuelMargin, setFuelMargin] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["appSettings", "main", orgId],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: "main", organization_id: orgId }, undefined, 1),
    enabled: !!orgId,
  });
  const main = rows[0];

  useEffect(() => {
    if (isLoading) return;
    const f = {};
    NUM_FIELDS.forEach((k) => {
      const v = main?.[k] ?? DEFAULTS[k];
      f[k] = v == null ? "" : String(v);
    });
    setForm(f);
    setFuelMargin(!!main?.fuel_margin_default);
  }, [main, isLoading]);

  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    const data = { fuel_margin_default: fuelMargin };
    NUM_FIELDS.forEach((k) => {
      if (form[k] !== "" && !isNaN(parseFloat(form[k]))) data[k] = parseFloat(form[k]);
    });
    if (main) await base44.entities.AppSettings.update(main.id, data);
    else await base44.entities.AppSettings.create({ organization_id: orgId, setting_key: "main", ...data });
    qc.invalidateQueries({ queryKey: ["appSettings"] });
    setSaving(false);
    toast.success("Rates & defaults saved");
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-bold text-base">Rates & defaults</h3>
          <p className="text-xs text-muted-foreground">Every cost group and estimate reads from here. Change once, applies everywhere going forward.</p>
        </div>
        <Button onClick={save} disabled={saving} className="shrink-0">{saving ? "Saving…" : "Save"}</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4">
        <RateField label="Fabrication labor" helper="Shop rate per person-hour" prefix="$" suffix="/ hr" value={form.labor_fab_rate ?? ""} onChange={set("labor_fab_rate")} />
        <RateField label="Install labor" helper="Field rate per person-hour" prefix="$" suffix="/ hr" value={form.labor_install_rate ?? ""} onChange={set("labor_install_rate")} />
        <RateField label="Default target margin" helper="Pre-fills every new estimate" suffix="%" value={form.default_target_margin_pct ?? ""} onChange={set("default_target_margin_pct")} />
        <RateField label="Fuel price" helper="Sample — enter your current price" prefix="$" suffix="/ gal" value={form.fuel_price_per_gal ?? ""} onChange={set("fuel_price_per_gal")} />
        <RateField label="Truck fuel economy" helper="Sample — used for trip gallons" suffix="mpg" value={form.truck_mpg ?? ""} onChange={set("truck_mpg")} />
        <RateField label="Margin on fuel" helper="Default; each estimate can turn it on">
          <div className="h-10 flex items-center gap-2">
            <Switch checked={fuelMargin} onCheckedChange={setFuelMargin} />
            <span className="text-sm font-mono">{fuelMargin ? "On" : "Off"}</span>
          </div>
        </RateField>
        <RateField label="Hours per install day" helper="Turns install hours into days" value={form.install_hours_per_day ?? ""} onChange={set("install_hours_per_day")} />
        <RateField label="Job minimum" helper="Warns when an estimate is under" prefix="$" value={form.job_minimum ?? ""} onChange={set("job_minimum")} />
        <RateField label="Deposit to schedule" helper="Shown on customer estimate" suffix="%" value={form.deposit_pct ?? ""} onChange={set("deposit_pct")} />
        <RateField label="Estimate valid for" helper="Sets the expiration date" suffix="days" value={form.estimate_valid_days ?? ""} onChange={set("estimate_valid_days")} />
      </div>
    </div>
  );
}