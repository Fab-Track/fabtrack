import React from "react";

export default function LayoutCard({ layout }) {
  const s = layout?.steps;
  const cells = [
    ["Posts", s?.posts],
    ["Sections", s?.posts],
    ["Section length", s ? `${s.sectionLength.toFixed(2)} ft` : null],
    ["Pickets / section", s?.picketsPerSection],
    ["Total pickets", s?.totalPickets],
    ["Post height", s ? `${s.postHeight}"` : null],
    ["Rail runs", layout?.params.rail_runs],
  ];
  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <h3 className="text-lg font-bold">Layout</h3>
        <span className="text-xs text-muted-foreground">From railing defaults + this style's overrides</span>
      </div>
      {!layout && <p className="text-sm text-muted-foreground mb-3">Enter a length and make sure railing standards and the default layout are set.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {cells.map(([label, val]) => (
          <div key={label} className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-mono text-lg font-bold">{val ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}