import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import RateField from "./RateField";
import { toast } from "sonner";

const FIELDS = ["res_post_height_in", "res_picket_length_in", "comm_post_height_in", "comm_picket_length_in"];
const DEFAULTS = { res_post_height_in: 36, res_picket_length_in: 29.5, comm_post_height_in: 43, comm_picket_length_in: 36.5 };

// Residential / commercial post heights and picket lengths (read by the railing takeoff).
export default function RailingStandardsCard() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["appSettings", "main", orgId],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: "main", organization_id: orgId }, undefined, 1),
    enabled: !!orgId,
  });
  const main = rows[0];

  useEffect(() => {
    const f = {};
    FIELDS.forEach((k) => { f[k] = String(main?.[k] ?? DEFAULTS[k]); });
    setForm(f);
  }, [main]);

  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));

  async function save() {
    setSaving(true);
    const data = {};
    FIELDS.forEach((k) => { data[k] = parseFloat(form[k]) || 0; });
    if (main) await base44.entities.AppSettings.update(main.id, data);
    else await base44.entities.AppSettings.create({ organization_id: orgId, setting_key: "main", ...data });
    qc.invalidateQueries({ queryKey: ["appSettings"] });
    setSaving(false);
    toast.success("Railing standards saved");
  }

  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-bold text-base">Railing standards</h3>
          <p className="text-xs text-muted-foreground">Default post heights and picket lengths applied at estimate time.</p>
        </div>
        <Button onClick={save} disabled={saving} className="shrink-0">{saving ? "Saving…" : "Save"}</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RateField label="Residential post height" helper="Inches" suffix="in" value={form.res_post_height_in ?? ""} onChange={set("res_post_height_in")} />
        <RateField label="Residential picket length" helper="Inches" suffix="in" value={form.res_picket_length_in ?? ""} onChange={set("res_picket_length_in")} />
        <RateField label="Commercial post height" helper="Inches" suffix="in" value={form.comm_post_height_in ?? ""} onChange={set("comm_post_height_in")} />
        <RateField label="Commercial picket length" helper="Inches" suffix="in" value={form.comm_picket_length_in ?? ""} onChange={set("comm_picket_length_in")} />
      </div>
    </div>
  );
}