import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import NumberFieldsDialog from "./NumberFieldsDialog";
import { OVERRIDE_FIELDS } from "@/lib/costGroups";

const STD_FIELDS = [
  { key: "res_post_height_in", label: "Residential post height (in)" },
  { key: "res_picket_length_in", label: "Residential picket length (in)" },
  { key: "comm_post_height_in", label: "Commercial post height (in)" },
  { key: "comm_picket_length_in", label: "Commercial picket length (in)" },
];
const LAYOUT_UNITS = { post_spacing_in: '"', post_width_in: '"', picket_clear_gap_in: '"', picket_width_in: '"', rail_runs: "" };
const show = (v, u = '"') => (v == null ? "—" : `${v}${u}`);

export default function StandardsCards({ category, settings, orgId, refresh }) {
  const [dlg, setDlg] = useState(null);
  const s = settings || {};

  async function saveStandards(vals) {
    if (settings?.id) await base44.entities.AppSettings.update(settings.id, vals);
    else await base44.entities.AppSettings.create({ organization_id: orgId, setting_key: "main", ...vals });
    refresh();
  }
  async function saveLayout(vals) {
    await base44.entities.CatalogCategory.update(category.id, vals);
    refresh();
  }

  const groups = [
    ["Residential", s.res_post_height_in, s.res_picket_length_in],
    ["Commercial", s.comm_post_height_in, s.comm_picket_length_in],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Railing standards</h4>
          <Button size="sm" variant="outline" onClick={() => setDlg("std")}>Edit</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {groups.map(([label, h, l]) => (
            <div key={label} className="bg-muted/40 rounded-lg p-3 text-sm">
              <p className="font-bold mb-1">{label}</p>
              <p>Post height {show(h)}</p>
              <p>Picket length {show(l)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Default layout — every style inherits</h4>
          <Button size="sm" variant="outline" onClick={() => setDlg("layout")}>Edit</Button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {OVERRIDE_FIELDS.map((f) => (
            <div key={f.key} className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="font-mono text-lg font-bold">{show(category[f.key], LAYOUT_UNITS[f.key])}</p>
              <p className="text-[11px] text-muted-foreground">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
      <NumberFieldsDialog open={dlg === "std"} onOpenChange={(o) => !o && setDlg(null)} title="Railing standards" fields={STD_FIELDS} values={s} onSave={saveStandards} />
      <NumberFieldsDialog open={dlg === "layout"} onOpenChange={(o) => !o && setDlg(null)} title="Default layout" hint="Every style in this category inherits these unless it overrides them." fields={OVERRIDE_FIELDS} values={category} onSave={saveLayout} />
    </div>
  );
}