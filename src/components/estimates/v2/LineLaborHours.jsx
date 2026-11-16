import React from "react";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { priceFromHard } from "@/lib/estimateCalc";
import LaborLine from "@/components/estimates/v2/LaborLine";

const num = (v) => parseFloat(v) || 0;
const hasMargin = (v) => v !== null && v !== undefined && v !== "";

export default function LineLaborHours({ line, crew, fabRate, installRate, frozen, fabMargin, instMargin, estMargin, onChange, onFabMargin, onInstMargin }) {
  const ov = line.hours_override || {};
  const r2 = (n) => Math.round((n || 0) * 100) / 100;
  // Frozen lines keep their stored snapshot, so read the hours back from the cost when needed.
  const baseFab = line._fab_hours_base ?? (fabRate > 0 ? r2((line.cost_breakdown?.fabrication || 0) / fabRate) : null);
  const baseInst = line._install_hours_base ?? line.install_hours ?? null;
  const fabHrs = ov.fabrication != null ? ov.fabrication : baseFab;
  const instHrs = ov.install != null ? ov.install : baseInst;
  // Crew assigned to the install: the estimator's number, else the catalog default.
  const catalogCrew = num(crew);
  const crewCount = ov.crew != null ? ov.crew : catalogCrew;
  const edited = ov.fabrication != null || ov.install != null || ov.crew != null;

  // Each labor line carries its own margin; blank means it follows the line margin.
  const fabCost = num(line.cost_breakdown?.fabrication);
  const instCost = num(line.cost_breakdown?.install);
  const fabPct = hasMargin(fabMargin) ? num(fabMargin) : num(estMargin);
  const instPct = hasMargin(instMargin) ? num(instMargin) : num(estMargin);

  const setOverride = (key, raw) => {
    const next = { ...ov };
    if (raw === "" || isNaN(parseFloat(raw))) delete next[key];
    else next[key] = parseFloat(raw);
    onChange(Object.keys(next).length ? next : null);
  };

  return (
    <div className="border-t bg-muted/20 px-4 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
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
        <p className="ml-auto text-[11px] text-muted-foreground">Rates are set in Settings › Job costing</p>
      </div>

      <LaborLine
        label="Fabrication labor"
        hours={fabHrs}
        rate={fabRate}
        cost={fabCost}
        margin={fabMargin}
        placeholder={estMargin != null ? String(estMargin) : ""}
        priced={r2(priceFromHard(fabCost, fabPct))}
        frozen={frozen}
        onHours={(v) => setOverride("fabrication", v)}
        onMargin={onFabMargin}
      />

      <LaborLine
        label="Install labor"
        hours={instHrs}
        rate={installRate}
        cost={instCost}
        margin={instMargin}
        placeholder={estMargin != null ? String(estMargin) : ""}
        priced={r2(priceFromHard(instCost, instPct))}
        frozen={frozen}
        onHours={(v) => setOverride("install", v)}
        onMargin={onInstMargin}
        extra={
          <div className="flex items-center gap-1.5">
            <span className="pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Crew</span>
            <Input
              type="number"
              step="1"
              min="1"
              disabled={frozen}
              className="h-8 w-14 bg-background text-center font-mono text-sm"
              value={crewCount ?? ""}
              onChange={(e) => setOverride("crew", e.target.value)}
            />
          </div>
        }
      />
    </div>
  );
}