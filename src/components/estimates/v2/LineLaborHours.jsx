import React from "react";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
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

  const group = ({ label, key, value, rate, crewCount, cost }) => (
    <div className="flex items-end gap-2.5">
      <div className="space-y-1">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            step="any"
            min="0"
            disabled={frozen}
            className="h-9 w-24 bg-background text-right font-mono text-sm"
            value={value ?? ""}
            onChange={(e) => setHours(key, e.target.value)}
          />
          <span className="text-[11px] text-muted-foreground">hrs</span>
        </div>
      </div>
      <div className="flex items-center gap-1 pb-1.5 text-[11px] whitespace-nowrap text-muted-foreground">
        <span>×</span>
        {crewCount != null && (
          <>
            <b className="font-mono font-semibold text-foreground">{crewCount}</b>
            <span>crew ×</span>
          </>
        )}
        <span className="font-mono">{money(rate, 2)}/hr</span>
        <span>=</span>
        <b className="font-mono text-sm font-semibold text-foreground">{money(cost || 0)}</b>
      </div>
    </div>
  );

  return (
    <div className="border-t bg-muted/20 px-4 py-2.5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="space-y-0.5 pb-1.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Labor hours
          </p>
          {frozen ? (
            <p className="text-[11px] text-muted-foreground">Locked on a sent estimate</p>
          ) : edited ? (
            <button type="button" className="text-[11px] text-primary underline" onClick={() => onChange(null)}>
              Reset to catalog
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground">From catalog</p>
          )}
        </div>

        {group({
          label: "Fabrication",
          key: "fabrication",
          value: fabHrs,
          rate: fabRate,
          crewCount: null,
          cost: line.cost_breakdown?.fabrication,
        })}
        {group({
          label: "Install",
          key: "install",
          value: instHrs,
          rate: installRate,
          crewCount: num(crew),
          cost: line.cost_breakdown?.install,
        })}

        <p className="ml-auto pb-2 text-[11px] text-muted-foreground">Rates are set in Settings › Job costing</p>
      </div>
    </div>
  );
}