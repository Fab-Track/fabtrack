import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { STYLE_OVERRIDE_FIELDS } from "@/lib/costGroups";

const num = (v) => parseFloat(v);
const fmt = (v, d = 2) => (v == null ? "—" : typeof v === "number" ? v.toFixed(d) : v);

export default function LayoutCard({ layout, item, category, orgClearance = 3.6875, onSaveOverride }) {
  const [draft, setDraft] = useState({});
  const s = layout?.steps;

  const cellVal = (label, val) => (
    <div key={label} className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-bold">{val ?? "—"}</p>
    </div>
  );

  const computed = [
    ["Posts", s?.posts],
    ["Sections", s?.bays],
    ["Bay width", s ? `${s.bayWidth.toFixed(2)}"` : null],
    ["Pickets / section", s?.picketsPerSection],
    ["Total pickets", s?.totalPickets],
    ["Railing height", s ? `${s.postHeight}"` : null],
    ["Top rail", s ? `${s.topRailHeight}"` : null],
    ["Bottom rail", s ? `${s.bottomRailHeight}"` : null],
    ["Clear height", s ? `${s.clearHeight.toFixed(2)}"` : null],
    ["Picket width", s ? `${s.picketWidth}"` : null],
    ["Picket height", s ? `${s.picketHeight}"` : null],
    ["Picket length", s ? `${s.picketLength.toFixed(2)}"` : null],
  ];

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <h3 className="text-lg font-bold">Layout</h3>
        <span className="text-xs text-muted-foreground">
          Leave blank to inherit the category default — max spacing is the largest allowed gap; picket width and height come from the picket cost item's size
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-4">
        {STYLE_OVERRIDE_FIELDS.map((f) => {
          const placeholder = category?.[f.key] ?? "";
          const val = draft[f.key] != null ? draft[f.key] : (item?.[f.key] ?? "");
          return (
            <div key={f.key} className="bg-muted/40 rounded-lg p-2">
              <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
              <Input
                type="number"
                step="any"
                className="h-8 text-sm font-mono"
                placeholder={placeholder === "" ? "—" : String(placeholder)}
                value={val}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                onBlur={() => {
                  if (draft[f.key] == null) return;
                  const n = num(draft[f.key]);
                  const cur = item?.[f.key] ?? null;
                  const newVal = draft[f.key] === "" || isNaN(n) ? null : n;
                  setDraft((d) => ({ ...d, [f.key]: undefined }));
                  if (newVal === cur) return;
                  onSaveOverride(f.key, newVal);
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="bg-muted/40 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Bottom Rail Height (off floor)</p>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="any"
                className="h-8 w-28 text-sm font-mono"
                placeholder={String(orgClearance)}
                value={draft.floor_to_bottom_rail_in != null ? draft.floor_to_bottom_rail_in : (item?.floor_to_bottom_rail_in ?? "")}
                onChange={(e) => setDraft((d) => ({ ...d, floor_to_bottom_rail_in: e.target.value }))}
                onBlur={() => {
                  const key = "floor_to_bottom_rail_in";
                  if (draft[key] == null) return;
                  const n = num(draft[key]);
                  const cur = item?.[key] ?? null;
                  const newVal = draft[key] === "" || isNaN(n) ? null : n;
                  setDraft((d) => ({ ...d, [key]: undefined }));
                  if (newVal === cur) return;
                  onSaveOverride(key, newVal);
                }}
              />
              <span className="text-xs text-muted-foreground">in</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground flex-1 min-w-[220px]">
            Clear gap from the floor to the underside of the bottom rail. Blank = org default ({orgClearance}"). This is not the bottom rail's profile height.
          </p>
        </div>
      </div>
      {!layout && <p className="text-sm text-muted-foreground mb-3">Set railing standards and a default length to see computed values.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {computed.map(([label, val]) => cellVal(label, val))}
        {cellVal("Rail runs", layout?.params.rail_runs)}
        {s?.infillSqFt > 0 && cellVal("Infill area", `${s.infillSqFt} sq ft`)}
      </div>
    </div>
  );
}