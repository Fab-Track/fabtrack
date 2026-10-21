import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { OVERRIDE_FIELDS } from "@/lib/costGroups";

const num = (v) => parseFloat(v);
const fmt = (v, d = 2) => (v == null ? "—" : typeof v === "number" ? v.toFixed(d) : v);

export default function LayoutCard({ layout, item, category, onSaveOverride }) {
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
    ["Sections", s?.posts],
    ["Section length", s ? `${s.sectionLength.toFixed(2)} ft` : null],
    ["Pickets / section", s?.picketsPerSection],
    ["Total pickets", s?.totalPickets],
    ["Post height", s ? `${s.postHeight}"` : null],
  ];

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <h3 className="text-lg font-bold">Layout</h3>
        <span className="text-xs text-muted-foreground">Leave blank to inherit the category default</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {OVERRIDE_FIELDS.map((f) => {
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
      {!layout && <p className="text-sm text-muted-foreground mb-3">Set railing standards and a default length to see computed values.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {computed.map(([label, val]) => cellVal(label, val))}
        {cellVal("Rail runs", layout?.params.rail_runs)}
      </div>
    </div>
  );
}