import React from "react";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/costGroups";

const num = (v) => parseFloat(v) || 0;

export default function LineLaborHours({ line, crew, fabRate, installRate, frozen, onChange }) {
  const ov = line.hours_override || {};
  const r2 = (n) => Math.round((n || 0) * 100) / 100;
  // Frozen lines keep their stored snapshot, so read the hours back from the cost when needed.
  const baseFab = line._fab_hours_base ?? (fabRate > 0 ? r2((line.cost_breakdown?.fabrication || 0) / fabRate) : null);
  const baseInst = line._install_hours_base ?? line.install_hours ?? null;
  const fabHrs = ov.fabrication != null ? ov.fabrication : baseFab;
  const instHrs = ov.install != null ? ov.install : baseInst;
  const edited = ov.fabrication != null || ov.install != null;

  const setHours = (key, raw) => {
    const next = { ...ov };
    if (raw === "" || isNaN(parseFloat(raw))) delete next[key];
    else next[key] = parseFloat(raw);
    onChange(Object.keys(next).length ? next : null);
  };

  const field = (key, value) => (
    <Input
      type="number"
      step="any"
      min="0"
      disabled={frozen}
      className="h-7 w-16 text-right font-mono text-xs"
      value={value ?? ""}
      onChange={(e) => setHours(key, e.target.value)}
    />
  );

  return (
    <div className="bg-muted/10 border-t px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Labor hrs</span>
      <span className="flex items-center gap-1">
        Fab {field("fabrication", fabHrs)} × <span className="font-mono">{money(fabRate, 2)}</span>/hr =
        <b className="font-mono">{money(line.cost_breakdown?.fabrication || 0)}</b>
      </span>
      <span className="flex items-center gap-1">
        Install {field("install", instHrs)} × crew {num(crew)} × <span className="font-mono">{money(installRate, 2)}</span>/hr =
        <b className="font-mono">{money(line.cost_breakdown?.install || 0)}</b>
      </span>
      {edited && !frozen && (
        <button type="button" className="text-primary underline" onClick={() => onChange(null)}>Reset to catalog</button>
      )}
      <span className="text-muted-foreground">Rates are set in Settings › Job costing</span>
    </div>
  );
}